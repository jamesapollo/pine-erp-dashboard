import { Navigate, Outlet, useSearchParams } from 'react-router-dom';

import { useSession } from '@/hooks/useSession';
import { SessionStatusScreen } from '@/components/auth/SessionStatusScreen';
import { getSafeRedirectPath } from '@/utils/safeRedirect';
import { ROUTES } from '@/constants/routes';

export function GuestRoute() {
  const session = useSession();
  const [searchParams] = useSearchParams();

  switch (session.status) {
    case 'loading':
      return <SessionStatusScreen status="loading" />;
    case 'error':
      return <SessionStatusScreen status="error" onRetry={session.retry} />;
    case 'anon':
      return <Outlet />;
    case 'no-store':
      return <Navigate to={ROUTES.ROOT} replace />;
    case 'authed':
      return <Navigate to={getSafeRedirectPath(searchParams.get('redirect'))} replace />;
  }
}
