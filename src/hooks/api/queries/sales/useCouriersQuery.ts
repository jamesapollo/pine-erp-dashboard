import { queryOptions, useQuery } from '@tanstack/react-query';

import { type Courier } from '@/types/sales';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function getCouriers(storeId: number): Promise<Courier[]> {
  const { data } = await axiosInstance.get<{ data: Courier[] }>(storePath(storeId, '/couriers'));
  return data.data;
}

export function couriersQueryOptions(storeId: number) {
  return queryOptions({
    queryKey: queryKeys.couriers(storeId),
    queryFn: () => getCouriers(storeId),
  });
}

export function useCouriersQuery() {
  const { store } = useAuthedSession();
  return useQuery(couriersQueryOptions(store.id));
}
