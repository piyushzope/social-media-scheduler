import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <span className="text-xl font-bold text-gray-900">Social Scheduler</span>
        </div>
        <nav className="mt-6 px-3">
          <NavLink href="/dashboard" icon="home">
            Dashboard
          </NavLink>
          <NavLink href="/dashboard/calendar" icon="calendar">
            Calendar
          </NavLink>
          <NavLink href="/dashboard/posts" icon="posts">
            Posts
          </NavLink>
          <NavLink href="/dashboard/analytics" icon="chart">
            Analytics
          </NavLink>
          <NavLink href="/dashboard/engagement" icon="message">
            Engagement
          </NavLink>
          <NavLink href="/dashboard/workspaces" icon="workspace">
            Workspaces
          </NavLink>
          <NavLink href="/dashboard/settings" icon="settings">
            Settings
          </NavLink>
        </nav>
      </aside>

      {/* Main content */}
      <main className="pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8">
          <div>{/* Breadcrumbs or page title */}</div>
          <div className="flex items-center gap-4">
            <button className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500">
              New Post
            </button>
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
    >
      <span className="h-5 w-5">{/* Icon placeholder */}</span>
      {children}
    </Link>
  );
}
