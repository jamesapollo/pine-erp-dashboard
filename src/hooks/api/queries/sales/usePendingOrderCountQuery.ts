import { useQuery } from '@tanstack/react-query';

import {
  ORDERS_REFETCH_INTERVAL_MILLISECONDS,
  ordersQueryOptions,
} from '@/hooks/api/queries/sales/useOrdersQuery';
import { useSession } from '@/hooks/useSession';

// The number of orders waiting for confirmation, for the sidebar badge.
//
// It reads useSession rather than useAuthedSession: when a request comes back 401 the
// sidebar can render once more with the signed-out session before ProtectedRoute
// redirects to login, and useAuthedSession would throw there.
export function usePendingOrderCountQuery({ enabled }: { enabled: boolean }): number | undefined {
  const session = useSession();
  const isAuthed = session.status === 'authed';
  const { data } = useQuery({
    ...ordersQueryOptions(isAuthed ? session.store.id : 0, { status: 'pending', perPage: 1 }),
    enabled: enabled && isAuthed,
    refetchInterval: ORDERS_REFETCH_INTERVAL_MILLISECONDS,
    refetchOnWindowFocus: true,
  });
  return data?.meta.total;
}
