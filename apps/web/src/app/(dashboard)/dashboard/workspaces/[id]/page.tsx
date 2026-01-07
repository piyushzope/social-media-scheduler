'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

interface Member {
  userId: string;
  roleId: string;
  joinedAt: string;
  user: User;
  role: Role;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  tier: string;
  settings: Record<string, any>;
  roles: Role[];
  members: Member[];
  platformAccounts: any[];
  _count: {
    posts: number;
  };
}

export default function WorkspaceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    fetchWorkspace();
  }, [workspaceId]);

  const fetchWorkspace = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(
        `http://localhost:4000/api/workspaces/${workspaceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch workspace');
      }

      const data = await response.json();
      setWorkspace(data);

      // Set default role for inviting
      const defaultRole = data.roles.find((r: Role) => r.name === 'Creator');
      if (defaultRole) {
        setInviteRoleId(defaultRole.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(
        `http://localhost:4000/api/workspaces/${workspaceId}/members`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: inviteEmail,
            roleId: inviteRoleId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to invite member');
      }

      // Refresh workspace data
      await fetchWorkspace();

      // Close modal and reset form
      setShowInviteModal(false);
      setInviteEmail('');
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading workspace...</div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-800">{error || 'Workspace not found'}</p>
        <Link
          href="/dashboard/workspaces"
          className="mt-2 inline-block text-sm font-medium text-red-600 hover:text-red-500"
        >
          ← Back to workspaces
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/dashboard/workspaces"
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Back to workspaces
        </Link>
      </div>

      {/* Workspace Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
            <p className="mt-1 text-sm text-gray-500">/{workspace.slug}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/workspaces/${workspaceId}/calendar`}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Calendar
            </Link>
            <Link
              href={`/dashboard/workspaces/${workspaceId}/posts`}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Posts
            </Link>
            <Link
              href={`/dashboard/workspaces/${workspaceId}/platforms`}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Platforms
            </Link>
            <Link
              href={`/dashboard/workspaces/${workspaceId}/approvals`}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Approvals
            </Link>
            <span className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-800">
              {workspace.tier}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">Members</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {workspace.members.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Connected Accounts</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {workspace.platformAccounts.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Posts</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {workspace._count.posts}
            </p>
          </div>
        </div>
      </div>

      {/* Members Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
          <button
            onClick={() => setShowInviteModal(true)}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            Invite Member
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {workspace.members.map((member) => (
                <tr key={member.userId}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {member.user.avatarUrl ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={member.user.avatarUrl}
                            alt=""
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                            {member.user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">
                          {member.user.name}
                          {member.userId === workspace.ownerId && (
                            <span className="ml-2 text-xs text-gray-500">(Owner)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{member.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold leading-5 text-green-800">
                      {member.role.name}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roles Section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Workspace Roles</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {workspace.roles.map((role) => (
            <div
              key={role.id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <h3 className="font-medium text-gray-900">{role.name}</h3>
              <div className="mt-2 flex flex-wrap gap-1">
                {role.permissions.map((permission, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                  >
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
            <form onSubmit={handleInvite} className="mt-4 space-y-4">
              {inviteError && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-800">{inviteError}</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="colleague@example.com"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="role"
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {workspace.roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
                >
                  {inviting ? 'Inviting...' : 'Send Invite'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteError('');
                    setInviteEmail('');
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
