import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PostStatus, ApprovalStatus } from '@social/database';

import { DatabaseService } from '@/common/database/database.service';

import { CreatePostDto, UpdatePostDto, SubmitForApprovalDto, ApprovalActionDto, ApprovalAction } from './dto';

@Injectable()
export class PostsService {
  constructor(private readonly db: DatabaseService) {}

  async create(workspaceId: string, userId: string, dto: CreatePostDto) {
    return this.db.post.create({
      data: {
        workspaceId,
        createdById: userId,
        title: dto.title,
        content: dto.content,
        mediaUrls: dto.mediaUrls || [],
        aiGenerated: false,
        platforms: {
          create: dto.platforms.map((p) => ({
            platform: p.platform,
            accountId: p.accountId,
            content: p.content,
            hashtags: p.hashtags || [],
          })),
        },
      },
      include: {
        platforms: true,
      },
    });
  }

  async findAll(
    workspaceId: string,
    options: { status?: string; page: number; limit: number },
  ) {
    const where = {
      workspaceId,
      ...(options.status && { status: options.status as PostStatus }),
    };

    const [posts, total] = await Promise.all([
      this.db.post.findMany({
        where,
        include: {
          platforms: true,
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.db.post.count({ where }),
    ]);

    return {
      data: posts,
      meta: {
        total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }

  async findOne(workspaceId: string, id: string) {
    const post = await this.db.post.findFirst({
      where: { id, workspaceId },
      include: {
        platforms: {
          include: {
            account: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        approvalSteps: {
          include: {
            approver: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async update(workspaceId: string, id: string, dto: UpdatePostDto) {
    await this.findOne(workspaceId, id);

    return this.db.post.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        mediaUrls: dto.mediaUrls,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
      include: {
        platforms: true,
      },
    });
  }

  async remove(workspaceId: string, id: string) {
    await this.findOne(workspaceId, id);
    await this.db.post.delete({ where: { id } });
    return { success: true };
  }

  async schedule(workspaceId: string, id: string, scheduledAt: Date) {
    await this.findOne(workspaceId, id);

    return this.db.post.update({
      where: { id },
      data: {
        scheduledAt,
        status: PostStatus.SCHEDULED,
      },
      include: {
        platforms: true,
      },
    });
  }

  // ============ Approval Workflow ============

  async submitForApproval(workspaceId: string, userId: string, postId: string, dto: SubmitForApprovalDto) {
    const post = await this.findOne(workspaceId, postId);

    // Only creator or admins can submit for approval
    if (post.createdById !== userId) {
      throw new ForbiddenException('Only post creator can submit for approval');
    }

    // Can only submit drafts
    if (post.status !== PostStatus.DRAFT) {
      throw new BadRequestException('Can only submit draft posts for approval');
    }

    // Validate approvers exist and are in workspace
    for (const step of dto.approvalSteps) {
      const membership = await this.db.workspaceMembership.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: step.approverId,
          },
        },
      });

      if (!membership) {
        throw new BadRequestException(`User ${step.approverId} is not a member of this workspace`);
      }
    }

    // Delete existing approval steps if any
    await this.db.approvalStep.deleteMany({
      where: { postId },
    });

    // Create approval steps and update post status
    return this.db.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.PENDING_APPROVAL,
        approvalSteps: {
          create: dto.approvalSteps.map((step) => ({
            approverId: step.approverId,
            order: step.order,
            status: ApprovalStatus.PENDING,
          })),
        },
      },
      include: {
        approvalSteps: {
          include: {
            approver: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        platforms: true,
      },
    });
  }

  async processApproval(workspaceId: string, userId: string, postId: string, stepId: string, dto: ApprovalActionDto) {
    const post = await this.findOne(workspaceId, postId);

    // Verify post is pending approval
    if (post.status !== PostStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Post is not pending approval');
    }

    // Find approval step
    const step = post.approvalSteps.find((s) => s.id === stepId);
    if (!step) {
      throw new NotFoundException('Approval step not found');
    }

    // Verify user is the approver or delegated
    if (step.approverId !== userId && step.delegatedTo !== userId) {
      throw new ForbiddenException('You are not authorized to approve this step');
    }

    // Verify step is pending
    if (step.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('This approval step has already been processed');
    }

    // Verify this is the next pending step (sequential approval)
    const steps = post.approvalSteps.sort((a, b) => a.order - b.order);
    const currentStepIndex = steps.findIndex((s) => s.id === stepId);
    const previousSteps = steps.slice(0, currentStepIndex);

    if (previousSteps.some((s) => s.status === ApprovalStatus.PENDING)) {
      throw new BadRequestException('Previous approval steps must be completed first');
    }

    // Update approval step
    await this.db.approvalStep.update({
      where: { id: stepId },
      data: {
        status: dto.action === ApprovalAction.APPROVE ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        comment: dto.comment,
        decidedAt: new Date(),
      },
    });

    // If rejected, update post status
    if (dto.action === ApprovalAction.REJECT) {
      await this.db.post.update({
        where: { id: postId },
        data: { status: PostStatus.DRAFT },
      });

      return this.findOne(workspaceId, postId);
    }

    // If approved, check if all steps are complete
    const updatedPost = await this.findOne(workspaceId, postId);
    const allApproved = updatedPost.approvalSteps.every(
      (s) => s.status === ApprovalStatus.APPROVED,
    );

    if (allApproved) {
      await this.db.post.update({
        where: { id: postId },
        data: { status: PostStatus.APPROVED },
      });
    }

    return this.findOne(workspaceId, postId);
  }

  async getPendingApprovals(workspaceId: string, userId: string) {
    // Find posts where user is an approver and the step is pending
    const posts = await this.db.post.findMany({
      where: {
        workspaceId,
        status: PostStatus.PENDING_APPROVAL,
        approvalSteps: {
          some: {
            OR: [
              { approverId: userId },
              { delegatedTo: userId },
            ],
            status: ApprovalStatus.PENDING,
          },
        },
      },
      include: {
        platforms: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        approvalSteps: {
          include: {
            approver: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return posts;
  }

  async delegateApproval(workspaceId: string, userId: string, postId: string, stepId: string, delegateToUserId: string) {
    const post = await this.findOne(workspaceId, postId);

    // Find approval step
    const step = post.approvalSteps.find((s) => s.id === stepId);
    if (!step) {
      throw new NotFoundException('Approval step not found');
    }

    // Verify user is the approver
    if (step.approverId !== userId) {
      throw new ForbiddenException('Only the assigned approver can delegate');
    }

    // Verify delegate user is in workspace
    const membership = await this.db.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: delegateToUserId,
        },
      },
    });

    if (!membership) {
      throw new BadRequestException('Delegate user is not a member of this workspace');
    }

    // Update approval step
    await this.db.approvalStep.update({
      where: { id: stepId },
      data: { delegatedTo: delegateToUserId },
    });

    return this.findOne(workspaceId, postId);
  }
}
