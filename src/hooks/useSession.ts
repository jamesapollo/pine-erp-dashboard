import { useMemo } from 'react';

import { useMeQuery } from '@/hooks/api/queries/auth/useMeQuery';
import { type Session } from '@/types/session';

export function useSession(): Session {
  const { data: user, isError, refetch } = useMeQuery();

  return useMemo<Session>(() => {
    if (user === undefined) {
      return isError ? { status: 'error', retry: () => void refetch() } : { status: 'loading' };
    }
    if (user === null) return { status: 'anon' };

    const [activeMembership] = user.memberships;
    if (!activeMembership) return { status: 'no-store', user };

    const { store, roles, permissions } = activeMembership;
    return {
      status: 'authed',
      user,
      store,
      roles,
      permissions,
      hasPermission: (slug) => permissions.includes(slug),
    };
  }, [user, isError, refetch]);
}
