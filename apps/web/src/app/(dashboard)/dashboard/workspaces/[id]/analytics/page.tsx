'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PlatformMetrics {
  platform: string;
  accountId: string;
  username: string;
  lastUpdated: string | null;
  metrics: {
    followers: number;
    impressions: number;
    reach: number;
    engagements: number;
    profileViews: number;
  };
  postsCount: number;
}

interface RecentPost {
  id: string;
  title: string | null;
  content: string;
  publishedAt: string;
  platforms: string[];
}

interface AnalyticsData {
  workspaceId: string;
  period: string;
  startDate: string;
  endDate: string;
  overview: {
    totalPosts: number;
    postsThisPeriod: number;
    totalImpressions: number;
    totalReach: number;
    totalEngagements: number;
    engagementRate: number;
    connectedAccounts: number;
  };
  platforms: PlatformMetrics[];
  statusBreakdown: Record<string, number>;
  recentPosts: RecentPost[];
}

const PLATFORM_COLORS = {
  META: 'bg-blue-600',
  X: 'bg-black',
  LINKEDIN: 'bg-blue-700',
  TIKTOK: 'bg-pink-600',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-500',
  PENDING_APPROVAL: 'bg-yellow-500',
  APPROVED: 'bg-green-500',
  SCHEDULED: 'bg-blue-500',
  PUBLISHED: 'bg-green-600',
  FAILED: 'bg-red-500',
};

export default function AnalyticsPage({ params }: { params: { id: string } }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:4000/api/workspaces/${params.id}/analytics/summary?period=${period}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error('Failed to fetch analytics');

      const data = await res.json();
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error || 'Failed to load analytics'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Analytics</h1>
          <p className="text-gray-600">
            Performance insights for your social media presence
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Impressions</p>
              <p className="text-2xl font-bold mt-1">
                {formatNumber(analytics.overview.totalImpressions)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reach</p>
              <p className="text-2xl font-bold mt-1">
                {formatNumber(analytics.overview.totalReach)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Engagement Rate</p>
              <p className="text-2xl font-bold mt-1">
                {analytics.overview.engagementRate}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Posts Published</p>
              <p className="text-2xl font-bold mt-1">
                {analytics.overview.postsThisPeriod}
                <span className="text-sm text-gray-500 font-normal ml-1">
                  / {analytics.overview.totalPosts} total
                </span>
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Platform Performance</h2>
          {analytics.platforms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No connected platforms</p>
              <Link
                href={`/dashboard/workspaces/${params.id}/platforms`}
                className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block"
              >
                Connect platforms →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.platforms.map((platform) => (
                <div key={platform.accountId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${PLATFORM_COLORS[platform.platform as keyof typeof PLATFORM_COLORS] || 'bg-gray-600'} rounded-lg flex items-center justify-center text-white font-bold`}>
                        {platform.platform[0]}
                      </div>
                      <div>
                        <p className="font-medium">{platform.platform}</p>
                        <p className="text-sm text-gray-500">@{platform.username}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{platform.postsCount} posts</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Impressions</p>
                      <p className="font-semibold">{formatNumber(platform.metrics.impressions)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Reach</p>
                      <p className="font-semibold">{formatNumber(platform.metrics.reach)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Engagements</p>
                      <p className="font-semibold">{formatNumber(platform.metrics.engagements)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Post Status Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Post Status</h2>
          <div className="space-y-3">
            {Object.entries(analytics.statusBreakdown).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[status] || 'bg-gray-400'}`}></div>
                  <span className="text-sm">{status.replace('_', ' ')}</span>
                </div>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Posts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Published Posts</h2>
        {analytics.recentPosts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No published posts in this period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {analytics.recentPosts.map((post) => (
              <Link
                key={post.id}
                href={`/dashboard/workspaces/${params.id}/posts/${post.id}`}
                className="block border rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{post.title || 'Untitled Post'}</p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {post.platforms.map((platform) => (
                        <span
                          key={platform}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {new Date(post.publishedAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
