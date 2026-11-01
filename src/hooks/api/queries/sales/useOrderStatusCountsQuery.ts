import { useQueries } from '@tanstack/react-query';

import { type OrderStatus } from '@/types/sales';
import {
  ORDERS_REFETCH_INTERVAL_MILLISECONDS,
  ordersQueryOptions,
} from '@/hooks/api/queries/sales/useOrdersQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';

const COUNTED_STATUSES: (OrderStatus | undefined)[] = [
  undefined,
  'pending',
  'confirmed',
  'dispatched',
  'completed',
  'cancelled',
];

export function useOrderStatusCountsQuery({
  search,
  feePending,
}: {
  search?: string;
  feePending?: boolean;
}) {
  const { store } = useAuthedSession();
  const results = useQueries({
    queries: COUNTED_STATUSES.map((status) => ({
      ...ordersQueryOptions(store.id, { status, search, feePending, perPage: 1 }),
      refetchInterval: ORDERS_REFETCH_INTERVAL_MILLISECONDS,
      refetchOnWindowFocus: 'always',
    })),
  });

  const counts: Record<'all' | OrderStatus, number | undefined> = {
    all: results[0].data?.meta.total,
    pending: results[1].data?.meta.total,
    confirmed: results[2].data?.meta.total,
    dispatched: results[3].data?.meta.total,
    completed: results[4].data?.meta.total,
    cancelled: results[5].data?.meta.total,
  };
  return { counts };
}
