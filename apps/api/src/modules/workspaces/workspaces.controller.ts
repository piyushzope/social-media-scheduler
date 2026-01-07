import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions, Permission } from '@/common/permissions';

import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto, InviteMemberDto, CreateRoleDto, UpdateRoleDto } from './dto';

@ApiTags('workspaces')
@ApiBearerAuth()
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  // No permission check needed - anyone can create a workspace
  @Post()
  create(@Request() req: any, @Body() createWorkspaceDto: CreateWorkspaceDto) {
    return this.workspacesService.create(req.user.id, createWorkspaceDto);
  }

  // No permission check needed - users can list their own workspaces
  @Get()
  findAll(@Request() req: any) {
    return this.workspacesService.findAll(req.user.id);
  }

  // No specific permission required - membership check is in service
  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.workspacesService.findOne(id, req.user.id);
  }

  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() updateWorkspaceDto: UpdateWorkspaceDto) {
    return this.workspacesService.update(id, req.user.id, updateWorkspaceDto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.workspacesService.delete(id, req.user.id);
  }

  @Post(':id/members')
  inviteMember(@Request() req: any, @Param('id') id: string, @Body() inviteMemberDto: InviteMemberDto) {
    return this.workspacesService.inviteMember(id, req.user.id, inviteMemberDto);
  }

  @Delete(':id/members/:memberId')
  removeMember(@Request() req: any, @Param('id') id: string, @Param('memberId') memberId: string) {
    return this.workspacesService.removeMember(id, req.user.id, memberId);
  }

  @Put(':id/members/:memberId/role')
  updateMemberRole(
    @Request() req: any,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body('roleId') roleId: string,
  ) {
    return this.workspacesService.updateMemberRole(id, req.user.id, memberId, roleId);
  }

  // ============ Role Management ============

  @Get(':id/roles')
  @ApiOperation({ summary: 'List all roles in workspace' })
  getRoles(@Request() req: any, @Param('id') id: string) {
    return this.workspacesService.findAllRoles(id, req.user.id);
  }

  @Post(':id/roles')
  @ApiOperation({ summary: 'Create a new role' })
  createRole(
    @Request() req: any,
    @Param('id') id: string,
    @Body() createRoleDto: CreateRoleDto,
  ) {
    return this.workspacesService.createRole(id, req.user.id, createRoleDto);
  }

  @Put(':id/roles/:roleId')
  @ApiOperation({ summary: 'Update a role' })
  updateRole(
    @Request() req: any,
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.workspacesService.updateRole(id, req.user.id, roleId, updateRoleDto);
  }

  @Delete(':id/roles/:roleId')
  @ApiOperation({ summary: 'Delete a role' })
  deleteRole(
    @Request() req: any,
    @Param('id') id: string,
    @Param('roleId') roleId: string,
  ) {
    return this.workspacesService.deleteRole(id, req.user.id, roleId);
  }
}
