import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';

import { DatabaseService } from '@/common/database/database.service';
import { DEFAULT_ROLE_PERMISSIONS } from '@/common/permissions';

import { CreateWorkspaceDto, UpdateWorkspaceDto, InviteMemberDto, CreateRoleDto, UpdateRoleDto } from './dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    // Check if slug already exists
    const existing = await this.db.workspace.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Workspace slug already exists');
    }

    // Create workspace with owner and default admin role
    const workspace = await this.db.workspace.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        tier: dto.tier || 'FREE',
        settings: dto.settings || {},
        owner: {
          connect: { id: userId },
        },
        // Create default roles
        roles: {
          create: [
            {
              name: 'Admin',
              isDefault: false,
              permissions: DEFAULT_ROLE_PERMISSIONS.Admin,
            },
            {
              name: 'Publisher',
              isDefault: false,
              permissions: DEFAULT_ROLE_PERMISSIONS.Publisher,
            },
            {
              name: 'Creator',
              isDefault: true,
              permissions: DEFAULT_ROLE_PERMISSIONS.Creator,
            },
            {
              name: 'Viewer',
              isDefault: false,
              permissions: DEFAULT_ROLE_PERMISSIONS.Viewer,
            },
          ],
        },
      },
      include: {
        roles: true,
      },
    });

    // Add owner as admin member
    const adminRole = workspace.roles.find((r) => r.name === 'Admin');

    await this.db.workspaceMembership.create({
      data: {
        workspaceId: workspace.id,
        userId,
        roleId: adminRole!.id,
      },
    });

    return workspace;
  }

  async findAll(userId: string) {
    return this.db.workspace.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        _count: {
          select: {
            members: true,
            platformAccounts: true,
            posts: true,
          },
        },
      },
    });
  }

  async findOne(workspaceId: string, userId: string) {
    const workspace = await this.db.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        roles: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
            role: true,
          },
        },
        platformAccounts: {
          select: {
            id: true,
            platform: true,
            platformUsername: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if user is a member
    const isMember = workspace.members.some((m: any) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    return workspace;
  }

  async update(workspaceId: string, userId: string, dto: UpdateWorkspaceDto) {
    const workspace = await this.findOne(workspaceId, userId);

    // Only owner can update workspace settings
    if (workspace.ownerId !== userId) {
      throw new ForbiddenException('Only workspace owner can update settings');
    }

    return this.db.workspace.update({
      where: { id: workspaceId },
      data: dto,
    });
  }

  async delete(workspaceId: string, userId: string) {
    const workspace = await this.findOne(workspaceId, userId);

    // Only owner can delete workspace
    if (workspace.ownerId !== userId) {
      throw new ForbiddenException('Only workspace owner can delete workspace');
    }

    return this.db.workspace.delete({
      where: { id: workspaceId },
    });
  }

  async inviteMember(workspaceId: string, userId: string, dto: InviteMemberDto) {
    const workspace = await this.findOne(workspaceId, userId);

    // Check if inviter has permission to invite members
    const inviterMembership = workspace.members.find((m: any) => m.userId === userId);
    if (!inviterMembership || !inviterMembership.role.permissions.includes('*')) {
      throw new ForbiddenException('You do not have permission to invite members');
    }

    // Find user by email
    const invitedUser = await this.db.user.findUnique({
      where: { email: dto.email },
    });

    if (!invitedUser) {
      throw new NotFoundException('User not found with this email');
    }

    // Check if user is already a member
    const existingMembership = await this.db.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: invitedUser.id,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of this workspace');
    }

    // Add member
    return this.db.workspaceMembership.create({
      data: {
        workspaceId,
        userId: invitedUser.id,
        roleId: dto.roleId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        role: true,
      },
    });
  }

  async removeMember(workspaceId: string, userId: string, memberId: string) {
    const workspace = await this.findOne(workspaceId, userId);

    // Check permissions
    const userMembership = workspace.members.find((m: any) => m.userId === userId);
    if (!userMembership || !userMembership.role.permissions.includes('*')) {
      throw new ForbiddenException('You do not have permission to remove members');
    }

    // Cannot remove owner
    if (workspace.ownerId === memberId) {
      throw new ForbiddenException('Cannot remove workspace owner');
    }

    return this.db.workspaceMembership.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberId,
        },
      },
    });
  }

  async updateMemberRole(workspaceId: string, userId: string, memberId: string, roleId: string) {
    const workspace = await this.findOne(workspaceId, userId);

    // Check permissions
    const userMembership = workspace.members.find((m: any) => m.userId === userId);
    if (!userMembership || !userMembership.role.permissions.includes('*')) {
      throw new ForbiddenException('You do not have permission to update member roles');
    }

    // Cannot change owner's role
    if (workspace.ownerId === memberId) {
      throw new ForbiddenException('Cannot change workspace owner role');
    }

    return this.db.workspaceMembership.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberId,
        },
      },
      data: {
        roleId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        role: true,
      },
    });
  }

  // ============ Role Management ============

  async createRole(workspaceId: string, userId: string, dto: CreateRoleDto) {
    const workspace = await this.findOne(workspaceId, userId);

    // Check permissions - only admins can create roles
    const userMembership = workspace.members.find((m: any) => m.userId === userId);
    if (!userMembership || !userMembership.role.permissions.includes('*')) {
      throw new ForbiddenException('You do not have permission to create roles');
    }

    // Check if role name already exists in workspace
    const existingRole = await this.db.role.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: dto.name,
        },
      },
    });

    if (existingRole) {
      throw new ConflictException('Role with this name already exists');
    }

    return this.db.role.create({
      data: {
        workspaceId,
        name: dto.name,
        permissions: dto.permissions,
        isDefault: dto.isDefault || false,
      },
    });
  }

  async findAllRoles(workspaceId: string, userId: string) {
    await this.findOne(workspaceId, userId);

    return this.db.role.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: {
            memberships: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async updateRole(workspaceId: string, userId: string, roleId: string, dto: UpdateRoleDto) {
    const workspace = await this.findOne(workspaceId, userId);

    // Check permissions - only admins can update roles
    const userMembership = workspace.members.find((m: any) => m.userId === userId);
    if (!userMembership || !userMembership.role.permissions.includes('*')) {
      throw new ForbiddenException('You do not have permission to update roles');
    }

    // Verify role belongs to workspace
    const role = await this.db.role.findFirst({
      where: {
        id: roleId,
        workspaceId,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if new name conflicts with existing role
    if (dto.name && dto.name !== role.name) {
      const existingRole = await this.db.role.findUnique({
        where: {
          workspaceId_name: {
            workspaceId,
            name: dto.name,
          },
        },
      });

      if (existingRole) {
        throw new ConflictException('Role with this name already exists');
      }
    }

    return this.db.role.update({
      where: { id: roleId },
      data: dto,
    });
  }

  async deleteRole(workspaceId: string, userId: string, roleId: string) {
    const workspace = await this.findOne(workspaceId, userId);

    // Check permissions - only admins can delete roles
    const userMembership = workspace.members.find((m: any) => m.userId === userId);
    if (!userMembership || !userMembership.role.permissions.includes('*')) {
      throw new ForbiddenException('You do not have permission to delete roles');
    }

    // Verify role belongs to workspace
    const role = await this.db.role.findFirst({
      where: {
        id: roleId,
        workspaceId,
      },
      include: {
        _count: {
          select: {
            memberships: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Cannot delete role if members are assigned to it
    if (role._count.memberships > 0) {
      throw new ConflictException(
        `Cannot delete role with ${role._count.memberships} assigned member(s). Reassign members first.`,
      );
    }

    return this.db.role.delete({
      where: { id: roleId },
    });
  }
}
