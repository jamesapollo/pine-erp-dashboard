import { Navigate, Outlet, useSearchParams } from 'react-router-dom';

import { useSession } from '@/hooks/useSession';
import { SessionStatusScreen } from '@/components/auth/SessionStatusScreen';
import { getSafeRedirectPath } from '@/utils/safeRedirect';
import { ROUTES } from '@/constants/routes';

// A re-invited person has no active store until they join, so signing in on the way to an invite
// must still take them back to it; any other redirect needs a store, so they go to the root.
function getNoStoreRedirectPath(redirect: string | null): string {
  const path = getSafeRedirectPath(redirect);
  const isAcceptInvite =
    path === ROUTES.ACCEPT_INVITE || path.startsWith(`${ROUTES.ACCEPT_INVITE}?`);
  return isAcceptInvite ? path : ROUTES.ROOT;
}

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
      return <Navigate to={getNoStoreRedirectPath(searchParams.get('redirect'))} replace />;
    case 'authed':
      return <Navigate to={getSafeRedirectPath(searchParams.get('redirect'))} replace />;
  }
}
