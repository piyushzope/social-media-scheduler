'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Member {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: {
    id: string;
    name: string;
    permissions: string[];
  };
}

interface ApprovalStep {
  approverId: string;
  order: number;
}

export default function SubmitForApprovalPage({
  params,
}: {
  params: { id: string; postId: string };
}) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>([
    { approverId: '', order: 1 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/api/workspaces/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to fetch workspace');

      const workspace = await res.json();
      // Filter members who have approval permission
      const approvers = workspace.members.filter((m: Member) =>
        m.role.permissions.includes('posts.approve') || m.role.permissions.includes('*')
      );
      setMembers(approvers);
    } catch (err) {
      setError('Failed to load workspace members');
    }
  };

  const addApprovalStep = () => {
    const nextOrder = approvalSteps.length + 1;
    setApprovalSteps([...approvalSteps, { approverId: '', order: nextOrder }]);
  };

  const removeApprovalStep = (index: number) => {
    const updated = approvalSteps.filter((_, i) => i !== index);
    // Reorder
    const reordered = updated.map((step, i) => ({ ...step, order: i + 1 }));
    setApprovalSteps(reordered);
  };

  const updateApprover = (index: number, approverId: string) => {
    const updated = [...approvalSteps];
    updated[index].approverId = approverId;
    setApprovalSteps(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate all approvers are selected
    if (approvalSteps.some(step => !step.approverId)) {
      setError('Please select an approver for each step');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:4000/api/workspaces/${params.id}/posts/${params.postId}/submit-for-approval`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ approvalSteps }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to submit for approval');
      }

      router.push(`/dashboard/workspaces/${params.id}/posts/${params.postId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Submit for Approval</h1>
        <p className="text-gray-600">
          Configure the approval workflow for this post. Approvers will review in sequential order.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Approval Steps</h2>
            <button
              type="button"
              onClick={addApprovalStep}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + Add Step
            </button>
          </div>

          <div className="space-y-4">
            {approvalSteps.map((step, index) => (
              <div key={index} className="flex items-center gap-4 p-4 border rounded">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">
                  {step.order}
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Approver
                  </label>
                  <select
                    value={step.approverId}
                    onChange={(e) => updateApprover(index, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select approver...</option>
                    {members.map((member) => (
                      <option key={member.user.id} value={member.user.id}>
                        {member.user.name} ({member.user.email}) - {member.role.name}
                      </option>
                    ))}
                  </select>
                </div>

                {approvalSteps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeApprovalStep(index)}
                    className="flex-shrink-0 text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            <strong>Note:</strong> Approvers will review this post in sequential order.
            Step 2 cannot approve until Step 1 has approved.
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
