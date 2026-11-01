import { queryOptions, useQuery } from '@tanstack/react-query';

import { type DeliveryZone } from '@/types/sales';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

/** Every zone of the store, by country, then in the order buyers see them. */
export async function getDeliveryZones(storeId: number): Promise<DeliveryZone[]> {
  const { data } = await axiosInstance.get<{ data: DeliveryZone[] }>(
    storePath(storeId, '/delivery-zones'),
  );
  return data.data;
}

export function deliveryZonesQueryOptions(storeId: number) {
  return queryOptions({
    queryKey: queryKeys.deliveryZones(storeId),
    queryFn: () => getDeliveryZones(storeId),
  });
}

export function useDeliveryZonesQuery() {
  const { store } = useAuthedSession();
  return useQuery(deliveryZonesQueryOptions(store.id));
}
