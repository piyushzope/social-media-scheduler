import { Injectable } from '@nestjs/common';

import { DatabaseService } from '@/common/database/database.service';
import { Permission, WILDCARD_PERMISSION } from './permissions.constants';

@Injectable()
export class PermissionsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Check if a user has a specific permission in a workspace
   */
  async userHasPermission(
    workspaceId: string,
    userId: string,
    permission: Permission,
  ): Promise<boolean> {
    const membership = await this.db.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!membership) {
      return false;
    }

    // Check for wildcard permission
    if (membership.role.permissions.includes(WILDCARD_PERMISSION)) {
      return true;
    }

    // Check for specific permission
    return membership.role.permissions.includes(permission);
  }

  /**
   * Check if a user has all of the specified permissions
   */
  async userHasAllPermissions(
    workspaceId: string,
    userId: string,
    permissions: Permission[],
  ): Promise<boolean> {
    const membership = await this.db.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!membership) {
      return false;
    }

    // Check for wildcard permission
    if (membership.role.permissions.includes(WILDCARD_PERMISSION)) {
      return true;
    }

    // Check if user has all required permissions
    return permissions.every((permission) =>
      membership.role.permissions.includes(permission),
    );
  }

  /**
   * Check if a user has any of the specified permissions
   */
  async userHasAnyPermission(
    workspaceId: string,
    userId: string,
    permissions: Permission[],
  ): Promise<boolean> {
    const membership = await this.db.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!membership) {
      return false;
    }

    // Check for wildcard permission
    if (membership.role.permissions.includes(WILDCARD_PERMISSION)) {
      return true;
    }

    // Check if user has any of the permissions
    return permissions.some((permission) =>
      membership.role.permissions.includes(permission),
    );
  }

  /**
   * Get all permissions for a user in a workspace
   */
  async getUserPermissions(
    workspaceId: string,
    userId: string,
  ): Promise<string[]> {
    const membership = await this.db.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!membership) {
      return [];
    }

    return membership.role.permissions;
  }
}
