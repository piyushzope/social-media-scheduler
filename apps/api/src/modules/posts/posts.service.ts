import { Injectable, NotFoundException } from '@nestjs/common';
import { PostStatus } from '@social/database';

import { DatabaseService } from '@/common/database/database.service';

import { CreatePostDto, UpdatePostDto } from './dto';

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
}
