'use client';

import Link from 'next/link';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600">Track your social media performance</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 h-12 w-12 text-4xl">📊</div>
        <h3 className="text-lg font-semibold text-gray-900">Select a Workspace</h3>
        <p className="mt-2 text-gray-600">
          Choose a workspace to view its analytics and insights.
        </p>
        <Link
          href="/dashboard/workspaces"
          className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Go to Workspaces
        </Link>
      </div>
    </div>
  );
}
