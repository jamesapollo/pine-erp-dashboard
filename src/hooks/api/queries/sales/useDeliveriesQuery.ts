import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';

import { type Paginated } from '@/types/catalogue';
import { type DeliveryListItem } from '@/types/sales';
import { queryKeys, type DeliveryListFilters } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export const DELIVERIES_PER_PAGE = 25;

export async function getDeliveries(
  storeId: number,
  filters: DeliveryListFilters,
): Promise<Paginated<DeliveryListItem>> {
  const { data } = await axiosInstance.get<Paginated<DeliveryListItem>>(
    storePath(storeId, '/deliveries'),
    {
      params: {
        status: filters.status,
        courier_id: filters.courierId,
        q: filters.search || undefined,
        page: filters.page,
        per_page: filters.perPage ?? DELIVERIES_PER_PAGE,
      },
    },
  );
  return data;
}

export function deliveriesQueryOptions(storeId: number, filters: DeliveryListFilters) {
  return queryOptions({
    queryKey: queryKeys.deliveryList(storeId, filters),
    queryFn: () => getDeliveries(storeId, filters),
  });
}

export function useDeliveriesQuery(filters: DeliveryListFilters) {
  const { store } = useAuthedSession();
  return useQuery({
    ...deliveriesQueryOptions(store.id, filters),
    placeholderData: keepPreviousData,
  });
}
