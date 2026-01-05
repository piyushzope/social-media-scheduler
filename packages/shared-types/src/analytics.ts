import type { Platform } from './platforms';

export interface AnalyticsSnapshot {
  accountId: string;
  platform: Platform;
  fetchedAt: Date;
  metrics: PlatformMetrics;
}

export interface PlatformMetrics {
  followers: number;
  followersGrowth: number;
  impressions: number;
  reach: number;
  engagementRate: number;
  clicks?: number;
  shares?: number;
  saves?: number;
  comments?: number;
  likes?: number;
}

export interface PostAnalytics {
  postId: string;
  platformPostId: string;
  platform: Platform;
  fetchedAt: Date;
  impressions: number;
  reach: number;
  engagementRate: number;
  clicks?: number;
  shares?: number;
  saves?: number;
  comments?: number;
  likes?: number;
}

export interface AnalyticsSummary {
  workspaceId: string;
  period: 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  platforms: {
    platform: Platform;
    lastUpdated: Date;
    metrics: PlatformMetrics;
  }[];
  totals: {
    posts: number;
    impressions: number;
    reach: number;
    engagementRate: number;
  };
}
