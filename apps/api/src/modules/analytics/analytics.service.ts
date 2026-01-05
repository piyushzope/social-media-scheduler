import { Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '@/common/database/database.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DatabaseService) {}

  async getSummary(workspaceId: string, period: 'day' | 'week' | 'month') {
    const accounts = await this.db.platformAccount.findMany({
      where: { workspaceId, isActive: true },
      include: {
        analytics: {
          orderBy: { fetchedAt: 'desc' },
          take: 1,
        },
      },
    });

    const startDate = this.getStartDate(period);
    const endDate = new Date();

    const postsCount = await this.db.post.count({
      where: {
        workspaceId,
        publishedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return {
      workspaceId,
      period,
      startDate,
      endDate,
      platforms: accounts.map((account) => ({
        platform: account.platform,
        accountId: account.id,
        username: account.platformUsername,
        lastUpdated: account.analytics[0]?.fetchedAt || null,
        metrics: account.analytics[0]?.metrics || null,
      })),
      totals: {
        posts: postsCount,
        // Aggregate metrics would be calculated here
        impressions: 0,
        reach: 0,
        engagementRate: 0,
      },
    };
  }

  async getAccountAnalytics(workspaceId: string, accountId: string) {
    const account = await this.db.platformAccount.findFirst({
      where: { id: accountId, workspaceId },
      include: {
        analytics: {
          orderBy: { fetchedAt: 'desc' },
          take: 30, // Last 30 snapshots
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return {
      account: {
        id: account.id,
        platform: account.platform,
        username: account.platformUsername,
      },
      snapshots: account.analytics,
    };
  }

  async getPostAnalytics(workspaceId: string, postId: string) {
    const post = await this.db.post.findFirst({
      where: { id: postId, workspaceId },
      include: {
        platforms: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // TODO: Fetch real-time analytics from each platform API
    return {
      postId: post.id,
      publishedAt: post.publishedAt,
      platforms: post.platforms.map((p) => ({
        platform: p.platform,
        publishedPostId: p.publishedPostId,
        // Analytics would be fetched from platform APIs
        metrics: null,
      })),
    };
  }

  private getStartDate(period: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
    }
  }
}
