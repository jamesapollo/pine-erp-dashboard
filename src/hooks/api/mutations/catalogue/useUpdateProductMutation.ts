import { hashKey, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { type Product } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

// Any `price` key requires pricing.manage; `price: null` clears the base price.
export type UpdateProductBody = Partial<{
  title: string;
  description: string | null;
  slug: string;
  category_ids: number[];
  is_featured: boolean;
  price: string | null;
}>;

export async function updateProduct(
  storeId: number,
  productId: number,
  body: UpdateProductBody,
): Promise<Product> {
  const { data } = await axiosInstance.patch<{ data: Product }>(
    storePath(storeId, `/products/${productId}`),
    body,
  );
  return data.data;
}

/**
 * Puts a product the API just returned into the detail cache and marks the product lists stale.
 * The detail query itself is left out of the invalidation: it already holds the response.
 */
export async function storeProductResponse(
  queryClient: QueryClient,
  storeId: number,
  product: Product,
) {
  const detailKey = queryKeys.product(storeId, product.id);
  queryClient.setQueryData(detailKey, product);
  await queryClient.invalidateQueries({
    queryKey: queryKeys.products(storeId),
    predicate: (query) => query.queryHash !== hashKey(detailKey),
  });
}

export type UpdateProductMutationParams = { productId: number; body: UpdateProductBody };

export function useUpdateProductMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, body }: UpdateProductMutationParams) =>
      updateProduct(store.id, productId, body),
    onSuccess: (product) => storeProductResponse(queryClient, store.id, product),
  });
}
