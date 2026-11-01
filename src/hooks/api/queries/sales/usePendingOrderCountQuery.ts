import { useQuery } from '@tanstack/react-query';

import {
  ORDERS_REFETCH_INTERVAL_MILLISECONDS,
  ordersQueryOptions,
} from '@/hooks/api/queries/sales/useOrdersQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';

// The number of orders waiting for confirmation, for the sidebar badge.
export function usePendingOrderCountQuery({ enabled }: { enabled: boolean }): number | undefined {
  const { store } = useAuthedSession();
  const { data } = useQuery({
    ...ordersQueryOptions(store.id, { status: 'pending', perPage: 1 }),
    enabled,
    refetchInterval: ORDERS_REFETCH_INTERVAL_MILLISECONDS,
    refetchOnWindowFocus: 'always',
  });
  return data?.meta.total;
}
