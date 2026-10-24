import { Navigate, Outlet } from 'react-router-dom';

import { useSession } from '@/hooks/useSession';
import { SessionStatusScreen } from '@/components/auth/SessionStatusScreen';
import { ROUTES } from '@/constants/routes';

export function GuestRoute() {
  const session = useSession();

  switch (session.status) {
    case 'loading':
      return <SessionStatusScreen status="loading" />;
    case 'error':
      return <SessionStatusScreen status="error" onRetry={session.retry} />;
    case 'anon':
      return <Outlet />;
    case 'no-store':
    case 'authed':
      return <Navigate to={ROUTES.ROOT} replace />;
  }
}
