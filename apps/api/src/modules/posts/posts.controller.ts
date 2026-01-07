import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions, Permission } from '@/common/permissions';

import { PostsService } from './posts.service';
import { CreatePostDto, UpdatePostDto, SubmitForApprovalDto, ApprovalActionDto } from './dto';

@ApiTags('posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('workspaces/:workspaceId/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @RequirePermissions(Permission.POSTS_CREATE)
  @ApiOperation({ summary: 'Create a new post' })
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreatePostDto,
    @Request() req: any,
  ) {
    return this.postsService.create(workspaceId, req.user.id, dto);
  }

  @Get()
  @RequirePermissions(Permission.POSTS_VIEW)
  @ApiOperation({ summary: 'List posts in workspace' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Param('workspaceId') workspaceId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.postsService.findAll(workspaceId, {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('pending-approvals')
  @RequirePermissions(Permission.POSTS_APPROVE)
  @ApiOperation({ summary: 'Get posts pending approval for current user' })
  async getPendingApprovals(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    return this.postsService.getPendingApprovals(workspaceId, req.user.id);
  }

  @Get(':id')
  @RequirePermissions(Permission.POSTS_VIEW)
  @ApiOperation({ summary: 'Get post by ID' })
  async findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.postsService.findOne(workspaceId, id);
  }

  @Put(':id')
  @RequirePermissions(Permission.POSTS_EDIT)
  @ApiOperation({ summary: 'Update a post' })
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.POSTS_DELETE)
  @ApiOperation({ summary: 'Delete a post' })
  async remove(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.postsService.remove(workspaceId, id);
  }

  @Post(':id/schedule')
  @RequirePermissions(Permission.POSTS_PUBLISH)
  @ApiOperation({ summary: 'Schedule a post for publishing' })
  async schedule(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body('scheduledAt') scheduledAt: string,
  ) {
    return this.postsService.schedule(workspaceId, id, new Date(scheduledAt));
  }

  // ============ Approval Workflow ============

  @Post(':id/submit-for-approval')
  @RequirePermissions(Permission.POSTS_CREATE)
  @ApiOperation({ summary: 'Submit post for approval' })
  async submitForApproval(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: SubmitForApprovalDto,
    @Request() req: any,
  ) {
    return this.postsService.submitForApproval(workspaceId, req.user.id, id, dto);
  }

  @Post(':id/approval-steps/:stepId/process')
  @RequirePermissions(Permission.POSTS_APPROVE)
  @ApiOperation({ summary: 'Approve or reject an approval step' })
  async processApproval(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: ApprovalActionDto,
    @Request() req: any,
  ) {
    return this.postsService.processApproval(workspaceId, req.user.id, id, stepId, dto);
  }

  @Post(':id/approval-steps/:stepId/delegate')
  @RequirePermissions(Permission.POSTS_APPROVE)
  @ApiOperation({ summary: 'Delegate approval step to another user' })
  async delegateApproval(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body('delegateToUserId') delegateToUserId: string,
    @Request() req: any,
  ) {
    return this.postsService.delegateApproval(workspaceId, req.user.id, id, stepId, delegateToUserId);
  }
}
