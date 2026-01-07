'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type Platform = 'META' | 'X' | 'LINKEDIN' | 'TIKTOK';
type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';

interface Post {
  id: string;
  title: string | null;
  content: string;
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  platforms: Array<{
    platform: Platform;
  }>;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  posts: Post[];
}

type ViewMode = 'month' | 'week';

const PLATFORM_ICONS: Record<Platform, string> = {
  META: '📘',
  X: '𝕏',
  LINKEDIN: '💼',
  TIKTOK: '🎵',
};

const STATUS_COLORS: Record<PostStatus, string> = {
  DRAFT: 'bg-gray-200 text-gray-700',
  SCHEDULED: 'bg-blue-200 text-blue-800',
  PUBLISHED: 'bg-green-200 text-green-800',
  FAILED: 'bg-red-200 text-red-800',
};

export default function CalendarPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [workspaceId]);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(
        `http://localhost:4000/api/workspaces/${workspaceId}/posts?limit=1000`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      setPosts(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const getCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();

    const days: CalendarDay[] = [];

    // Add days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        posts: getPostsForDate(date),
      });
    }

    // Add days from current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        posts: getPostsForDate(date),
      });
    }

    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        posts: getPostsForDate(date),
      });
    }

    return days;
  };

  const getWeekDays = (): CalendarDay[] => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push({
        date,
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        posts: getPostsForDate(date),
      });
    }

    return days;
  };

  const getPostsForDate = (date: Date): Post[] => {
    const dateStr = date.toISOString().split('T')[0];
    return posts.filter(post => {
      const postDate = post.scheduledAt || post.publishedAt;
      if (!postDate) return false;
      const postDateStr = new Date(postDate).toISOString().split('T')[0];
      return postDateStr === dateStr;
    });
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  const calendarDays = viewMode === 'month' ? getCalendarDays() : getWeekDays();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-8">
        <Link
          href={`/dashboard/workspaces/${workspaceId}`}
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Back to workspace
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
        <Link
          href={`/dashboard/workspaces/${workspaceId}/posts/new`}
          className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
        >
          Create Post
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Calendar Controls */}
      <div className="mt-6 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => viewMode === 'month' ? navigateMonth(-1) : navigateWeek(-1)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Previous
          </button>
          <button
            onClick={goToToday}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={() => viewMode === 'month' ? navigateMonth(1) : navigateWeek(1)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>

        <h2 className="text-lg font-semibold text-gray-900">{monthName}</h2>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('month')}
            className={`rounded-md px-3 py-1 text-sm font-medium ${
              viewMode === 'month'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`rounded-md px-3 py-1 text-sm font-medium ${
              viewMode === 'week'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="border-r border-gray-200 px-2 py-3 text-center text-xs font-semibold uppercase text-gray-600 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className={`grid ${viewMode === 'month' ? 'grid-cols-7' : 'grid-cols-7'}`}>
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`min-h-[120px] border-b border-r border-gray-200 p-2 last:border-r-0 ${
                !day.isCurrentMonth ? 'bg-gray-50' : ''
              } ${isToday(day.date) ? 'bg-blue-50' : ''}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`text-sm ${
                    !day.isCurrentMonth
                      ? 'text-gray-400'
                      : isToday(day.date)
                      ? 'font-bold text-primary-600'
                      : 'text-gray-900'
                  }`}
                >
                  {day.date.getDate()}
                </span>
                {day.posts.length > 0 && (
                  <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-medium text-white">
                    {day.posts.length}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {day.posts.slice(0, 3).map((post) => (
                  <Link
                    key={post.id}
                    href={`/dashboard/workspaces/${workspaceId}/posts/${post.id}`}
                    className={`block rounded px-2 py-1 text-xs hover:opacity-80 ${
                      STATUS_COLORS[post.status]
                    }`}
                    title={post.content}
                  >
                    <div className="flex items-center gap-1">
                      <div className="flex gap-0.5">
                        {post.platforms.slice(0, 2).map((p, i) => (
                          <span key={i} className="text-xs">
                            {PLATFORM_ICONS[p.platform]}
                          </span>
                        ))}
                      </div>
                      <span className="truncate">
                        {post.title || post.content.substring(0, 20)}
                      </span>
                    </div>
                  </Link>
                ))}
                {day.posts.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{day.posts.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <span className="text-sm font-medium text-gray-700">Status:</span>
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-1 text-xs ${STATUS_COLORS.SCHEDULED}`}>
            Scheduled
          </span>
          <span className={`rounded px-2 py-1 text-xs ${STATUS_COLORS.PUBLISHED}`}>
            Published
          </span>
          <span className={`rounded px-2 py-1 text-xs ${STATUS_COLORS.DRAFT}`}>
            Draft
          </span>
          <span className={`rounded px-2 py-1 text-xs ${STATUS_COLORS.FAILED}`}>
            Failed
          </span>
        </div>
      </div>
    </div>
  );
}
