import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useSession } from '@/hooks/useSession';
import { useSignOut } from '@/hooks/useSignOut';
import { NoStoreAccess } from '@/components/auth/NoStoreAccess';
import { SessionStatusScreen } from '@/components/auth/SessionStatusScreen';
import { ROUTES } from '@/constants/routes';

export function ProtectedRoute() {
  const session = useSession();
  const { pathname, search } = useLocation();
  const { signOut } = useSignOut();

  switch (session.status) {
    case 'loading':
      return <SessionStatusScreen status="loading" />;
    case 'error':
      return <SessionStatusScreen status="error" onRetry={session.retry} />;
    case 'anon': {
      const destination = pathname + search;
      const loginPath =
        destination === ROUTES.ROOT
          ? ROUTES.LOGIN
          : `${ROUTES.LOGIN}?redirect=${encodeURIComponent(destination)}`;
      return <Navigate to={loginPath} replace />;
    }
    case 'no-store':
      return <NoStoreAccess onSignOut={() => void signOut()} />;
    case 'authed':
      return <Outlet />;
  }
}
