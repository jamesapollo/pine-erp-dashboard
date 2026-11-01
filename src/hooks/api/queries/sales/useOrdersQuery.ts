import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';

import { type Paginated } from '@/types/catalogue';
import { type OrderListItem } from '@/types/sales';
import { queryKeys, type OrderListFilters } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export const ORDERS_PER_PAGE = 25;
export const ORDERS_REFETCH_INTERVAL_MILLISECONDS = 60_000;

export async function getOrders(
  storeId: number,
  filters: OrderListFilters,
): Promise<Paginated<OrderListItem>> {
  const { data } = await axiosInstance.get<Paginated<OrderListItem>>(
    storePath(storeId, '/orders'),
    {
      params: {
        status: filters.status,
        q: filters.search || undefined,
        delivery_fee: filters.feePending ? 'pending' : undefined,
        page: filters.page,
        per_page: filters.perPage ?? ORDERS_PER_PAGE,
      },
    },
  );
  return data;
}

export function ordersQueryOptions(storeId: number, filters: OrderListFilters) {
  return queryOptions({
    queryKey: queryKeys.orderList(storeId, filters),
    queryFn: () => getOrders(storeId, filters),
  });
}

export function useOrdersQuery(filters: OrderListFilters) {
  const { store } = useAuthedSession();
  return useQuery({
    ...ordersQueryOptions(store.id, filters),
    placeholderData: keepPreviousData,
    refetchInterval: ORDERS_REFETCH_INTERVAL_MILLISECONDS,
    refetchOnWindowFocus: 'always',
  });
}
