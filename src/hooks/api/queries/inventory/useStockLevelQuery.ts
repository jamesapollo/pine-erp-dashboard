import { queryOptions, useQuery } from '@tanstack/react-query';

import { type VariantStockLevel } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function getStockLevel(
  storeId: number,
  variantId: number,
): Promise<VariantStockLevel> {
  const { data } = await axiosInstance.get<{ data: VariantStockLevel }>(
    storePath(storeId, `/stock-levels/${variantId}`),
  );
  return data.data;
}

export function stockLevelQueryOptions(storeId: number, variantId: number) {
  return queryOptions({
    queryKey: queryKeys.stockLevel(storeId, variantId),
    queryFn: () => getStockLevel(storeId, variantId),
  });
}

// A non-positive or non-integer id (such as NaN from a bad URL) never sends a request.
export function useStockLevelQuery(variantId: number) {
  const { store } = useAuthedSession();
  return useQuery({
    ...stockLevelQueryOptions(store.id, variantId),
    enabled: Number.isInteger(variantId) && variantId > 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
}
