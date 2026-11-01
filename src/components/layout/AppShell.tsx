import { Outlet } from 'react-router-dom';

import { useAuthedSession } from '@/hooks/useAuthedSession';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export function AppShell() {
  const { store, user, roles, permissions } = useAuthedSession();

  return (
    <div className="flex min-h-screen bg-surface-app">
      <Sidebar store={store} user={user} roles={roles} permissions={permissions} />
      <div className="min-w-0 flex-1">
        <Topbar />
        <main className="mx-auto max-w-[1240px] px-8 pb-16 pt-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
