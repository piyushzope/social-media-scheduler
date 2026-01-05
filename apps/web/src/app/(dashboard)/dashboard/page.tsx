export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Welcome to your social media scheduling dashboard.
      </p>

      {/* Quick stats */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Scheduled Posts" value="12" change="+3 this week" />
        <StatCard title="Published Today" value="5" change="2 remaining" />
        <StatCard title="Total Reach" value="45.2K" change="+12% from last week" />
        <StatCard title="Engagement Rate" value="4.8%" change="+0.5%" />
      </div>

      {/* Recent activity */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Upcoming Posts</h2>
        <div className="mt-4 rounded-lg border border-gray-200 bg-white">
          <div className="p-6 text-center text-gray-500">
            No posts scheduled. Create your first post to get started.
          </div>
        </div>
      </div>

      {/* Connected accounts */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Connected Accounts</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AccountCard platform="Meta" connected={false} />
          <AccountCard platform="X" connected={false} />
          <AccountCard platform="LinkedIn" connected={false} />
          <AccountCard platform="TikTok" connected={false} />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
}: {
  title: string;
  value: string;
  change: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-600">{change}</p>
    </div>
  );
}

function AccountCard({
  platform,
  connected,
}: {
  platform: string;
  connected: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900">{platform}</span>
        {connected ? (
          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
            Connected
          </span>
        ) : (
          <button className="text-sm font-medium text-primary-600 hover:text-primary-500">
            Connect
          </button>
        )}
      </div>
    </div>
  );
}
