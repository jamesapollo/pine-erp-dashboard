import { useQueries } from '@tanstack/react-query';

import { type DeliveryStatus, type OrderStatus } from '@/types/sales';
import { deliveriesQueryOptions } from '@/hooks/api/queries/sales/useDeliveriesQuery';
import {
  ORDERS_REFETCH_INTERVAL_MILLISECONDS,
  ordersQueryOptions,
} from '@/hooks/api/queries/sales/useOrdersQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';

const COUNTED_ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed'];
const COUNTED_DELIVERY_STATUSES: DeliveryStatus[] = ['dispatched', 'in_transit', 'failed'];

function sumTotals(totals: (number | undefined)[]): number | undefined {
  return totals.some((total) => total === undefined)
    ? undefined
    : totals.reduce<number>((sum, total) => sum + (total ?? 0), 0);
}

/**
 * How many orders wait at each step, for the overview. There is no counts endpoint, so each figure
 * is a one-row request read for its total. Orders arrive from the storefront, so these poll like
 * the orders list. Undefined until loaded.
 */
export function useSalesPipelineCountsQuery({ enabled }: { enabled: boolean }) {
  const { store } = useAuthedSession();
  const live = {
    enabled,
    refetchInterval: ORDERS_REFETCH_INTERVAL_MILLISECONDS,
    refetchOnWindowFocus: 'always' as const,
  };
  const [pending, confirmed] = useQueries({
    queries: COUNTED_ORDER_STATUSES.map((status) => ({
      ...ordersQueryOptions(store.id, { status, perPage: 1 }),
      ...live,
    })),
  });
  const [dispatched, inTransit, failed] = useQueries({
    queries: COUNTED_DELIVERY_STATUSES.map((status) => ({
      ...deliveriesQueryOptions(store.id, { status, perPage: 1 }),
      ...live,
    })),
  });

  return {
    awaitingConfirmation: pending.data?.meta.total,
    readyToDispatch: confirmed.data?.meta.total,
    outForDelivery: sumTotals([dispatched.data?.meta.total, inTransit.data?.meta.total]),
    failedDeliveries: failed.data?.meta.total,
  };
}
