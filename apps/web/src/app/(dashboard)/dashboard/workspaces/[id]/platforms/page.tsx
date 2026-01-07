'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Platform = 'META' | 'X' | 'LINKEDIN' | 'TIKTOK';

interface PlatformAccount {
  id: string;
  platform: Platform;
  platformUsername: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
}

const PLATFORM_DETAILS = {
  META: {
    name: 'Meta (Facebook & Instagram)',
    color: 'bg-blue-600',
    icon: '📘',
  },
  X: {
    name: 'X (Twitter)',
    color: 'bg-black',
    icon: '𝕏',
  },
  LINKEDIN: {
    name: 'LinkedIn',
    color: 'bg-blue-700',
    icon: '💼',
  },
  TIKTOK: {
    name: 'TikTok',
    color: 'bg-pink-600',
    icon: '🎵',
  },
};

export default function WorkspacePlatformsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceId = params.id as string;

  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchAccounts();

    // Check if we just connected an account
    const connectedId = searchParams.get('connected');
    if (connectedId) {
      setSuccessMessage('Platform account connected successfully!');
      // Clean up URL
      router.replace(`/dashboard/workspaces/${workspaceId}/platforms`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [workspaceId, searchParams]);

  const fetchAccounts = async () => {
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
        if (response.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch platform accounts');
      }

      const data = await response.json();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: Platform) => {
    setConnecting(platform);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(
        `http://localhost:4000/api/workspaces/${workspaceId}/platforms/oauth/${platform}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to get OAuth URL');
      }

      const data = await response.json();

      // Redirect to OAuth URL
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect platform');
      setConnecting(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this platform account?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(
        `http://localhost:4000/api/workspaces/${workspaceId}/platforms/${accountId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to disconnect platform');
      }

      // Refresh accounts list
      await fetchAccounts();
      setSuccessMessage('Platform account disconnected successfully');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect platform');
    }
  };

  const isConnected = (platform: Platform) => {
    return accounts.some(account => account.platform === platform);
  };

  const getConnectedAccount = (platform: Platform) => {
    return accounts.find(account => account.platform === platform);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading platform accounts...</div>
      </div>
    );
  }

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

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Connected Platforms</h1>
        <p className="mt-1 text-sm text-gray-600">
          Connect your social media accounts to schedule and publish posts
        </p>
      </div>

      {successMessage && (
        <div className="mt-4 rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {(Object.keys(PLATFORM_DETAILS) as Platform[]).map((platform) => {
          const details = PLATFORM_DETAILS[platform];
          const connected = isConnected(platform);
          const account = getConnectedAccount(platform);

          return (
            <div
              key={platform}
              className="rounded-lg border border-gray-200 bg-white p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${details.color} text-2xl text-white`}>
                    {details.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{details.name}</h3>
                    {connected && account && (
                      <p className="mt-1 text-sm text-gray-500">
                        @{account.platformUsername}
                      </p>
                    )}
                  </div>
                </div>

                {connected ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    Not connected
                  </span>
                )}
              </div>

              <div className="mt-4">
                {connected && account ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Status:</span>
                      <span className="font-medium text-gray-900">
                        {account.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Connected:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(account.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDisconnect(account.id)}
                      className="mt-2 w-full rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(platform)}
                    disabled={connecting === platform}
                    className="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
                  >
                    {connecting === platform ? 'Connecting...' : 'Connect Account'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <h3 className="font-medium text-yellow-900">Note about OAuth Setup</h3>
        <p className="mt-1 text-sm text-yellow-700">
          To connect platform accounts, you need to configure OAuth credentials in your environment variables.
          Each platform requires a Client ID, Client Secret, and Redirect URI. Check the documentation for setup instructions.
        </p>
      </div>
    </div>
  );
}
