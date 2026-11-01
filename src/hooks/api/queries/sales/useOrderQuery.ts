import { queryOptions, useQuery } from '@tanstack/react-query';

import { type Order } from '@/types/sales';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function getOrder(storeId: number, orderId: number): Promise<Order> {
  const { data } = await axiosInstance.get<{ data: Order }>(
    storePath(storeId, `/orders/${orderId}`),
  );
  return data.data;
}

export function orderQueryOptions(storeId: number, orderId: number) {
  return queryOptions({
    queryKey: queryKeys.order(storeId, orderId),
    queryFn: () => getOrder(storeId, orderId),
  });
}

// A non-positive or non-integer id (such as NaN from a bad URL) never sends a request.
export function useOrderQuery(orderId: number) {
  const { store } = useAuthedSession();
  return useQuery({
    ...orderQueryOptions(store.id, orderId),
    enabled: Number.isInteger(orderId) && orderId > 0,
    refetchOnWindowFocus: true,
  });
}
