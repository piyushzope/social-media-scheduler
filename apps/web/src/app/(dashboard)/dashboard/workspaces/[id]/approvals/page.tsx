'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ApprovalStep {
  id: string;
  order: number;
  approverId: string;
  delegatedTo: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
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
  status: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  approvalSteps: ApprovalStep[];
  platforms: Array<{
    id: string;
    platform: string;
  }>;
}

export default function ApprovalsPage({ params }: { params: { id: string } }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingStep, setProcessingStep] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:4000/api/workspaces/${params.id}/posts/pending-approvals`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error('Failed to fetch pending approvals');

      const data = await res.json();
      setPosts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (postId: string, stepId: string, action: 'APPROVE' | 'REJECT', comment?: string) => {
    setProcessingStep(stepId);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:4000/api/workspaces/${params.id}/posts/${postId}/approval-steps/${stepId}/process`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ action, comment }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to process approval');
      }

      // Refresh the list
      await fetchPendingApprovals();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessingStep(null);
    }
  };

  const getCurrentUserStep = (post: Post): ApprovalStep | null => {
    const userId = localStorage.getItem('userId');
    return post.approvalSteps.find(
      step => (step.approverId === userId || step.delegatedTo === userId) && step.status === 'PENDING'
    ) || null;
  };

  const canApproveNow = (post: Post, step: ApprovalStep): boolean => {
    // Check if all previous steps are approved
    const previousSteps = post.approvalSteps.filter(s => s.order < step.order);
    return previousSteps.every(s => s.status === 'APPROVED');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-600">Loading pending approvals...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Pending Approvals</h1>
        <p className="text-gray-600">
          Posts awaiting your approval
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No pending approvals</h3>
          <p className="text-gray-500">You don't have any posts to review at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const currentStep = getCurrentUserStep(post);
            const canApprove = currentStep ? canApproveNow(post, currentStep) : false;

            return (
              <div key={post.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Link
                      href={`/dashboard/workspaces/${params.id}/posts/${post.id}`}
                      className="text-lg font-semibold text-blue-600 hover:text-blue-700"
                    >
                      {post.title || 'Untitled Post'}
                    </Link>
                    <div className="text-sm text-gray-500 mt-1">
                      By {post.createdBy.name} • {new Date(post.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {post.platforms.map((p) => (
                      <span
                        key={p.id}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {p.platform}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-gray-700 mb-4 line-clamp-2">{post.content}</p>

                {/* Approval Steps */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Approval Progress</h4>
                  <div className="space-y-2">
                    {post.approvalSteps.map((step) => (
                      <div
                        key={step.id}
                        className={`flex items-center gap-3 p-3 rounded ${
                          step.id === currentStep?.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
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
                          <div className="text-sm font-medium">{step.approver.name}</div>
                          {step.comment && (
                            <div className="text-xs text-gray-600 mt-1">"{step.comment}"</div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {step.status === 'PENDING' ? 'Pending' : step.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                {currentStep && (
                  <div className="border-t pt-4">
                    {canApprove ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproval(post.id, currentStep.id, 'APPROVE')}
                          disabled={processingStep === currentStep.id}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                        >
                          {processingStep === currentStep.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => {
                            const comment = prompt('Reason for rejection (optional):');
                            if (comment !== null) {
                              handleApproval(post.id, currentStep.id, 'REJECT', comment || undefined);
                            }
                          }}
                          disabled={processingStep === currentStep.id}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
                        Waiting for previous approval steps to complete
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
