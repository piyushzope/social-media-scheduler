'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Platform = 'META' | 'X' | 'LINKEDIN' | 'TIKTOK';
type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  tier: string;
  _count: {
    members: number;
    platformAccounts: number;
    posts: number;
  };
}

interface Post {
  id: string;
  workspaceId: string;
  title: string | null;
  content: string;
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  platforms: Array<{
    platform: Platform;
  }>;
}

interface PlatformAccount {
  id: string;
  platform: Platform;
  platformUsername: string;
  workspaceId: string;
}

const PLATFORM_DETAILS = {
  META: { name: 'Meta', icon: '📘', color: 'bg-blue-600' },
  X: { name: 'X', icon: '𝕏', color: 'bg-black' },
  LINKEDIN: { name: 'LinkedIn', icon: '💼', color: 'bg-blue-700' },
  TIKTOK: { name: 'TikTok', icon: '🎵', color: 'bg-pink-600' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [upcomingPosts, setUpcomingPosts] = useState<Post[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccount[]>([]);
  const [stats, setStats] = useState({
    totalScheduled: 0,
    publishedToday: 0,
    totalDrafts: 0,
    totalWorkspaces: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch workspaces
      const workspacesRes = await fetch('http://localhost:4000/api/workspaces', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!workspacesRes.ok) throw new Error('Failed to fetch workspaces');
      const workspacesData = await workspacesRes.json();
      setWorkspaces(workspacesData);

      // Fetch posts and platform accounts for all workspaces
      const allPosts: Post[] = [];
      const allAccounts: PlatformAccount[] = [];

      for (const workspace of workspacesData) {
        // Fetch posts
        const postsRes = await fetch(
          `http://localhost:4000/api/workspaces/${workspace.id}/posts?limit=100`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          allPosts.push(...postsData.data.map((p: any) => ({ ...p, workspaceId: workspace.id })));
        }

        // Fetch platform accounts
        const accountsRes = await fetch(
          `http://localhost:4000/api/workspaces/${workspace.id}/platforms`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json();
          allAccounts.push(...accountsData.map((a: any) => ({ ...a, workspaceId: workspace.id })));
        }
      }

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const scheduledPosts = allPosts.filter(p => p.status === 'SCHEDULED');
      const publishedToday = allPosts.filter(p => {
        if (!p.publishedAt) return false;
        const publishDate = new Date(p.publishedAt);
        return publishDate >= today && publishDate < tomorrow;
      });
      const drafts = allPosts.filter(p => p.status === 'DRAFT');

      setStats({
        totalScheduled: scheduledPosts.length,
        publishedToday: publishedToday.length,
        totalDrafts: drafts.length,
        totalWorkspaces: workspacesData.length,
      });

      // Get upcoming posts (next 7 days)
      const upcoming = allPosts
        .filter(p => p.scheduledAt && new Date(p.scheduledAt) >= new Date())
        .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
        .slice(0, 5);
      setUpcomingPosts(upcoming);

      // Get recent posts
      const recent = allPosts
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      setRecentPosts(recent);

      setPlatformAccounts(allAccounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  // Get unique workspace for first-time users
  const primaryWorkspace = workspaces[0];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome back! Here's what's happening with your social media.
          </p>
        </div>
        {primaryWorkspace && (
          <Link
            href={`/dashboard/workspaces/${primaryWorkspace.id}/posts/new`}
            className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            Create Post
          </Link>
        )}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Workspaces"
          value={stats.totalWorkspaces.toString()}
          change={workspaces.length === 0 ? 'Get started' : 'Active'}
          icon="🏢"
        />
        <StatCard
          title="Scheduled Posts"
          value={stats.totalScheduled.toString()}
          change={stats.totalScheduled > 0 ? 'Ready to publish' : 'No posts scheduled'}
          icon="📅"
        />
        <StatCard
          title="Published Today"
          value={stats.publishedToday.toString()}
          change={stats.publishedToday > 0 ? 'Great work!' : 'Nothing yet'}
          icon="✅"
        />
        <StatCard
          title="Drafts"
          value={stats.totalDrafts.toString()}
          change={stats.totalDrafts > 0 ? 'Needs review' : 'All clear'}
          icon="📝"
        />
      </div>

      {/* Workspaces Overview */}
      {workspaces.length === 0 ? (
        <div className="mt-8 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">No workspaces yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Create your first workspace to start managing social media content.
          </p>
          <Link
            href="/dashboard/workspaces/new"
            className="mt-4 inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            Create Workspace
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Your Workspaces</h2>
            <Link
              href="/dashboard/workspaces"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              View all →
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.slice(0, 3).map((workspace) => (
              <Link
                key={workspace.id}
                href={`/dashboard/workspaces/${workspace.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-6 transition hover:border-primary-500 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{workspace.name}</h3>
                  <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800">
                    {workspace.tier}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                  <div>
                    <p className="text-xs text-gray-500">Members</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {workspace._count.members}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Accounts</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {workspace._count.platformAccounts}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Posts</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {workspace._count.posts}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Upcoming Posts */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Posts</h2>
          <div className="mt-4 rounded-lg border border-gray-200 bg-white">
            {upcomingPosts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No posts scheduled. Create your first post to get started.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {upcomingPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/dashboard/workspaces/${post.workspaceId}/posts/${post.id}`}
                    className="block p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {post.title || post.content}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {post.scheduledAt && new Date(post.scheduledAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="ml-4 flex gap-1">
                        {post.platforms.slice(0, 3).map((p, i) => (
                          <span key={i} className="text-lg">
                            {PLATFORM_DETAILS[p.platform].icon}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <div className="mt-4 rounded-lg border border-gray-200 bg-white">
            {recentPosts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No recent activity. Start creating posts!
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recentPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/dashboard/workspaces/${post.workspaceId}/posts/${post.id}`}
                    className="block p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {post.title || post.content}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            post.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                            post.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                            post.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {post.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 flex gap-1">
                        {post.platforms.slice(0, 3).map((p, i) => (
                          <span key={i} className="text-lg">
                            {PLATFORM_DETAILS[p.platform].icon}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connected Platform Accounts */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Connected Accounts</h2>
          {primaryWorkspace && (
            <Link
              href={`/dashboard/workspaces/${primaryWorkspace.id}/platforms`}
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              Manage →
            </Link>
          )}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {platformAccounts.length === 0 ? (
            <div className="col-span-full rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-500">
                No platform accounts connected yet.
              </p>
              {primaryWorkspace && (
                <Link
                  href={`/dashboard/workspaces/${primaryWorkspace.id}/platforms`}
                  className="mt-2 inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  Connect platforms →
                </Link>
              )}
            </div>
          ) : (
            platformAccounts.slice(0, 4).map((account) => {
              const details = PLATFORM_DETAILS[account.platform];
              return (
                <div key={account.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${details.color} text-white`}>
                      {details.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{details.name}</p>
                      <p className="text-xs text-gray-500">@{account.platformUsername}</p>
                    </div>
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      Active
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  icon: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-600">{change}</p>
    </div>
  );
}
