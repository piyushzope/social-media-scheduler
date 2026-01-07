import { Injectable, NotFoundException } from '@nestjs/common';
import { Platform } from '@social/database';

import { DatabaseService } from '@/common/database/database.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DatabaseService) {}

  async getSummary(workspaceId: string, period: 'day' | 'week' | 'month' = 'week') {
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

    // Get posts published in the period
    const posts = await this.db.post.findMany({
      where: {
        workspaceId,
        status: 'PUBLISHED',
        publishedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        platforms: true,
      },
    });

    // Get all posts (for total count)
    const allPostsCount = await this.db.post.count({
      where: {
        workspaceId,
        status: 'PUBLISHED',
      },
    });

    // Calculate aggregated metrics
    let totalImpressions = 0;
    let totalReach = 0;
    let totalEngagements = 0;

    // Aggregate from latest analytics snapshots
    accounts.forEach((account) => {
      if (account.analytics[0]?.metrics) {
        const metrics = account.analytics[0].metrics as any;
        totalImpressions += metrics.impressions || 0;
        totalReach += metrics.reach || 0;
        totalEngagements += metrics.engagements || 0;
      }
    });

    const engagementRate = totalImpressions > 0
      ? (totalEngagements / totalImpressions) * 100
      : 0;

    // Group posts by platform
    const postsByPlatform = this.groupPostsByPlatform(posts);

    // Get post status breakdown
    const statusBreakdown = await this.getStatusBreakdown(workspaceId);

    return {
      workspaceId,
      period,
      startDate,
      endDate,
      overview: {
        totalPosts: allPostsCount,
        postsThisPeriod: posts.length,
        totalImpressions,
        totalReach,
        totalEngagements,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        connectedAccounts: accounts.length,
      },
      platforms: accounts.map((account) => ({
        platform: account.platform,
        accountId: account.id,
        username: account.platformUsername,
        lastUpdated: account.analytics[0]?.fetchedAt || null,
        metrics: account.analytics[0]?.metrics || this.getDefaultMetrics(),
        postsCount: postsByPlatform[account.platform] || 0,
      })),
      statusBreakdown,
      recentPosts: posts.slice(0, 10).map(post => ({
        id: post.id,
        title: post.title,
        content: post.content.substring(0, 100) + '...',
        publishedAt: post.publishedAt,
        platforms: post.platforms.map(p => p.platform),
      })),
    };
  }

  private groupPostsByPlatform(posts: any[]): Record<Platform, number> {
    const counts: Record<string, number> = {};

    posts.forEach(post => {
      post.platforms.forEach((p: any) => {
        counts[p.platform] = (counts[p.platform] || 0) + 1;
      });
    });

    return counts as Record<Platform, number>;
  }

  private async getStatusBreakdown(workspaceId: string) {
    const statuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'FAILED'];
    const breakdown: Record<string, number> = {};

    for (const status of statuses) {
      const count = await this.db.post.count({
        where: { workspaceId, status: status as any },
      });
      breakdown[status] = count;
    }

    return breakdown;
  }

  private getDefaultMetrics() {
    return {
      followers: 0,
      impressions: 0,
      reach: 0,
      engagements: 0,
      profileViews: 0,
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
