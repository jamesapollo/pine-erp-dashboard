import { queryOptions, useQuery } from '@tanstack/react-query';

import { type Product } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function getProduct(storeId: number, productId: number): Promise<Product> {
  const { data } = await axiosInstance.get<{ data: Product }>(
    storePath(storeId, `/products/${productId}`),
  );
  return data.data;
}

export function productQueryOptions(storeId: number, productId: number) {
  return queryOptions({
    queryKey: queryKeys.product(storeId, productId),
    queryFn: () => getProduct(storeId, productId),
  });
}

// A non-positive or non-integer id (such as NaN from a bad URL) never sends a request.
export function useProductQuery(productId: number) {
  const { store } = useAuthedSession();
  return useQuery({
    ...productQueryOptions(store.id, productId),
    enabled: Number.isInteger(productId) && productId > 0,
  });
}
