'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type PostStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
type Platform = 'META' | 'X' | 'LINKEDIN' | 'TIKTOK';
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface ApprovalStep {
  id: string;
  order: number;
  approverId: string;
  delegatedTo: string | null;
  status: ApprovalStatus;
  comment: string | null;
  decidedAt: string | null;
  approver: {
    id: string;
    name: string;
    email: string;
  };
}

interface Post {
  id: string;
  title: string | null;
  content: string;
  mediaUrls: string[];
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  approvalSteps?: ApprovalStep[];
  platforms: Array<{
    id: string;
    platform: Platform;
    content: string | null;
    hashtags: string[];
    status: PostStatus;
    publishedPostId: string | null;
    publishedAt: string | null;
    failureReason: string | null;
    account: {
      id: string;
      platformUsername: string;
    };
  }>;
}

const STATUS_COLORS: Record<PostStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  PUBLISHING: 'bg-purple-100 text-purple-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

const PLATFORM_DETAILS = {
  META: { name: 'Meta', icon: '📘', color: 'bg-blue-600' },
  X: { name: 'X', icon: '𝕏', color: 'bg-black' },
  LINKEDIN: { name: 'LinkedIn', icon: '💼', color: 'bg-blue-700' },
  TIKTOK: { name: 'TikTok', icon: '🎵', color: 'bg-pink-600' },
};

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const postId = params.postId as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPost();
  }, [workspaceId, postId]);

  const fetchPost = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(
        `http://localhost:4000/api/workspaces/${workspaceId}/posts/${postId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch post');
      }

      const data = await response.json();
      setPost(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading post...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-800">{error || 'Post not found'}</p>
        <Link
          href={`/dashboard/workspaces/${workspaceId}/posts`}
          className="mt-2 inline-block text-sm font-medium text-red-600 hover:text-red-500"
        >
          ← Back to posts
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <Link
          href={`/dashboard/workspaces/${workspaceId}/posts`}
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Back to posts
        </Link>
      </div>

      {/* Post Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {post.title && (
              <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
            )}
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span>Created by {post.createdBy.name}</span>
              <span>•</span>
              <span>{new Date(post.createdAt).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${STATUS_COLORS[post.status]}`}>
              {post.status.replace('_', ' ')}
            </span>
            {post.status === 'DRAFT' && (
              <Link
                href={`/dashboard/workspaces/${workspaceId}/posts/${postId}/submit-for-approval`}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Submit for Approval
              </Link>
            )}
          </div>
        </div>

        {post.scheduledAt && (
          <div className="mt-4 rounded-md bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              <strong>Scheduled for:</strong> {new Date(post.scheduledAt).toLocaleString()}
            </p>
          </div>
        )}

        {post.publishedAt && (
          <div className="mt-4 rounded-md bg-green-50 p-3">
            <p className="text-sm text-green-800">
              <strong>Published at:</strong> {new Date(post.publishedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Post Content */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Content</h2>
        <div className="mt-4 whitespace-pre-wrap text-gray-700">
          {post.content}
        </div>

        {post.mediaUrls.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-900">Media</h3>
            <div className="mt-2 space-y-2">
              {post.mediaUrls.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <img
                    src={url}
                    alt={`Media ${index + 1}`}
                    className="h-24 w-24 rounded object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden text-sm text-primary-600 hover:underline"
                  >
                    {url}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Approval Steps */}
      {post.approvalSteps && post.approvalSteps.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Approval Progress</h2>
          <div className="mt-4 space-y-3">
            {post.approvalSteps.map((step) => (
              <div
                key={step.id}
                className={`rounded-lg border p-4 ${
                  step.status === 'APPROVED'
                    ? 'border-green-200 bg-green-50'
                    : step.status === 'REJECTED'
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      step.status === 'APPROVED'
                        ? 'bg-green-500 text-white'
                        : step.status === 'REJECTED'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {step.status === 'APPROVED' ? '✓' : step.status === 'REJECTED' ? '✗' : step.order}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          Step {step.order}: {step.approver.name}
                        </p>
                        <p className="text-sm text-gray-500">{step.approver.email}</p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          step.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : step.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                    {step.comment && (
                      <div className="mt-2 rounded bg-white p-2 text-sm text-gray-700">
                        <span className="font-medium">Comment:</span> {step.comment}
                      </div>
                    )}
                    {step.decidedAt && (
                      <div className="mt-1 text-xs text-gray-500">
                        {step.status === 'APPROVED' ? 'Approved' : 'Rejected'} on{' '}
                        {new Date(step.decidedAt).toLocaleString()}
                      </div>
                    )}
                    {step.delegatedTo && (
                      <div className="mt-1 text-xs text-blue-600">Delegated to another user</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform Configurations */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Platform Details</h2>
        <div className="mt-4 space-y-4">
          {post.platforms.map((platformConfig) => {
            const details = PLATFORM_DETAILS[platformConfig.platform];
            return (
              <div
                key={platformConfig.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${details.color} text-white`}>
                      {details.icon}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{details.name}</p>
                      <p className="text-sm text-gray-500">
                        @{platformConfig.account.platformUsername}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${STATUS_COLORS[platformConfig.status]}`}>
                    {platformConfig.status.replace('_', ' ')}
                  </span>
                </div>

                {platformConfig.content && (
                  <div className="mt-3 rounded-md bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Custom Content</p>
                    <p className="mt-1 text-sm text-gray-700">{platformConfig.content}</p>
                  </div>
                )}

                {platformConfig.hashtags.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-500">Hashtags</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {platformConfig.hashtags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {platformConfig.publishedAt && (
                  <div className="mt-2 text-xs text-gray-500">
                    Published: {new Date(platformConfig.publishedAt).toLocaleString()}
                  </div>
                )}

                {platformConfig.failureReason && (
                  <div className="mt-2 rounded-md bg-red-50 p-2">
                    <p className="text-xs font-medium text-red-800">Error</p>
                    <p className="text-xs text-red-700">{platformConfig.failureReason}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
