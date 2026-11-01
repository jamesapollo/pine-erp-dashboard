import { queryOptions, useQuery } from '@tanstack/react-query';

import { type Delivery } from '@/types/sales';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function getDelivery(storeId: number, deliveryId: number): Promise<Delivery> {
  const { data } = await axiosInstance.get<{ data: Delivery }>(
    storePath(storeId, `/deliveries/${deliveryId}`),
  );
  return data.data;
}

export function deliveryQueryOptions(storeId: number, deliveryId: number) {
  return queryOptions({
    queryKey: queryKeys.delivery(storeId, deliveryId),
    queryFn: () => getDelivery(storeId, deliveryId),
  });
}

// A non-positive or non-integer id (such as NaN from a bad URL) never sends a request.
export function useDeliveryQuery(deliveryId: number) {
  const { store } = useAuthedSession();
  return useQuery({
    ...deliveryQueryOptions(store.id, deliveryId),
    enabled: Number.isInteger(deliveryId) && deliveryId > 0,
    refetchOnWindowFocus: true,
  });
}
