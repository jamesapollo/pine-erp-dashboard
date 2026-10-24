import { Outlet } from 'react-router-dom';

import { useSession } from '@/hooks/useSession';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export function AppShell() {
  const session = useSession();
  if (session.status !== 'authed') return null;

  return (
    <div className="flex min-h-screen bg-surface-app">
      <Sidebar store={session.store} user={session.user} roles={session.roles} />
      <div className="min-w-0 flex-1">
        <Topbar title="Overview" />
        <main className="mx-auto max-w-[1240px] px-8 pb-16 pt-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
