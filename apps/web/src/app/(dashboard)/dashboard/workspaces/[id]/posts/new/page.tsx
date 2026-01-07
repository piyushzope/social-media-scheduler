'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type Platform = 'META' | 'X' | 'LINKEDIN' | 'TIKTOK';

interface PlatformAccount {
  id: string;
  platform: Platform;
  platformUsername: string;
}

interface PlatformConfig {
  platform: Platform;
  accountId: string;
  content?: string;
  hashtags?: string[];
  enabled: boolean;
}

const PLATFORM_DETAILS = {
  META: { name: 'Meta', icon: '📘', color: 'bg-blue-600' },
  X: { name: 'X', icon: '𝕏', color: 'bg-black' },
  LINKEDIN: { name: 'LinkedIn', icon: '💼', color: 'bg-blue-700' },
  TIKTOK: { name: 'TikTok', icon: '🎵', color: 'bg-pink-600' },
};

export default function NewPostPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);

  // Form fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>(['']);
  const [platformConfigs, setPlatformConfigs] = useState<Record<string, PlatformConfig>>({});
  const [scheduledAt, setScheduledAt] = useState('');

  useEffect(() => {
    fetchPlatformAccounts();
  }, [workspaceId]);

  const fetchPlatformAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(
        `http://localhost:4000/api/workspaces/${workspaceId}/platforms`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch platform accounts');
      }

      const data = await response.json();
      setAccounts(data);

      // Initialize platform configs
      const configs: Record<string, PlatformConfig> = {};
      data.forEach((account: PlatformAccount) => {
        configs[account.id] = {
          platform: account.platform,
          accountId: account.id,
          content: '',
          hashtags: [],
          enabled: false,
        };
      });
      setPlatformConfigs(configs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (accountId: string) => {
    setPlatformConfigs(prev => {
      const existing = prev[accountId];
      if (!existing) return prev;
      return {
        ...prev,
        [accountId]: {
          ...existing,
          enabled: !existing.enabled,
        },
      };
    });
  };

  const updatePlatformContent = (accountId: string, content: string) => {
    setPlatformConfigs(prev => {
      const existing = prev[accountId];
      if (!existing) return prev;
      return {
        ...prev,
        [accountId]: {
          ...existing,
          content,
        },
      };
    });
  };

  const updatePlatformHashtags = (accountId: string, hashtagsStr: string) => {
    const hashtags = hashtagsStr
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    setPlatformConfigs(prev => {
      const existing = prev[accountId];
      if (!existing) return prev;
      return {
        ...prev,
        [accountId]: {
          ...existing,
          hashtags,
        },
      };
    });
  };

  const addMediaUrl = () => {
    setMediaUrls([...mediaUrls, '']);
  };

  const updateMediaUrl = (index: number, value: string) => {
    const newUrls = [...mediaUrls];
    newUrls[index] = value;
    setMediaUrls(newUrls);
  };

  const removeMediaUrl = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Get enabled platforms
      const enabledPlatforms = Object.values(platformConfigs)
        .filter(config => config.enabled)
        .map(config => ({
          platform: config.platform,
          accountId: config.accountId,
          content: config.content || undefined,
          hashtags: config.hashtags && config.hashtags.length > 0 ? config.hashtags : undefined,
        }));

      if (enabledPlatforms.length === 0) {
        setError('Please select at least one platform');
        setSubmitting(false);
        return;
      }

      // Filter out empty media URLs
      const validMediaUrls = mediaUrls.filter(url => url.trim().length > 0);

      const postData = {
        title: title || undefined,
        content,
        mediaUrls: validMediaUrls.length > 0 ? validMediaUrls : undefined,
        platforms: enabledPlatforms,
      };

      const response = await fetch(
        `http://localhost:4000/api/workspaces/${workspaceId}/posts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(postData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create post');
      }

      // If scheduling, schedule the post
      if (scheduledAt) {
        await fetch(
          `http://localhost:4000/api/workspaces/${workspaceId}/posts/${data.id}/schedule`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ scheduledAt }),
          }
        );
      }

      // Redirect to posts list or post detail
      router.push(`/dashboard/workspaces/${workspaceId}/posts`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-md bg-yellow-50 p-4">
        <h3 className="text-sm font-medium text-yellow-800">No platforms connected</h3>
        <p className="mt-2 text-sm text-yellow-700">
          You need to connect at least one platform account before creating posts.
        </p>
        <Link
          href={`/dashboard/workspaces/${workspaceId}/platforms`}
          className="mt-3 inline-flex items-center rounded-md bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-500"
        >
          Connect Platforms
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <Link
          href={`/dashboard/workspaces/${workspaceId}`}
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Back to workspace
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Post</h1>
        <p className="mt-1 text-sm text-gray-600">
          Compose and schedule posts across multiple platforms
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Main Content Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Post Content</h2>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title (Optional)
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Give your post a title for internal tracking"
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="What do you want to share?"
              />
              <p className="mt-1 text-sm text-gray-500">
                {content.length} characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Media URLs (Optional)
              </label>
              {mediaUrls.map((url, index) => (
                <div key={index} className="mt-2 flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateMediaUrl(index, e.target.value)}
                    className="block flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="https://example.com/image.jpg"
                  />
                  {mediaUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMediaUrl(index)}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addMediaUrl}
                className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                + Add another media URL
              </button>
            </div>
          </div>
        </div>

        {/* Platform Selection */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Select Platforms</h2>
          <p className="mt-1 text-sm text-gray-600">
            Choose which platforms to publish this post on
          </p>

          <div className="mt-4 space-y-4">
            {accounts.map((account) => {
              const details = PLATFORM_DETAILS[account.platform];
              const config = platformConfigs[account.id];

              return (
                <div
                  key={account.id}
                  className={`rounded-lg border p-4 ${
                    config?.enabled ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${details.color} text-white`}>
                        {details.icon}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{details.name}</p>
                        <p className="text-sm text-gray-500">@{account.platformUsername}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={config?.enabled || false}
                        onChange={() => togglePlatform(account.id)}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300"></div>
                    </label>
                  </div>

                  {config?.enabled && (
                    <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Custom Content (Optional)
                        </label>
                        <textarea
                          value={config.content}
                          onChange={(e) => updatePlatformContent(account.id, e.target.value)}
                          rows={3}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder={`Custom content for ${details.name} (leave empty to use main content)`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Hashtags (Optional)
                        </label>
                        <input
                          type="text"
                          value={config.hashtags?.join(', ') || ''}
                          onChange={(e) => updatePlatformHashtags(account.id, e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="marketing, socialmedia, tips (comma-separated)"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scheduling */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Schedule (Optional)</h2>
          <p className="mt-1 text-sm text-gray-600">
            Leave empty to save as draft, or schedule for later
          </p>

          <div className="mt-4">
            <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-700">
              Publish Date & Time
            </label>
            <input
              type="datetime-local"
              id="scheduledAt"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : scheduledAt ? 'Schedule Post' : 'Create Draft'}
          </button>
          <Link
            href={`/dashboard/workspaces/${workspaceId}`}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
