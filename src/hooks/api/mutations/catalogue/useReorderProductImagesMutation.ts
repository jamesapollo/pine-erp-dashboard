import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type ProductImage } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function reorderProductImages(
  storeId: number,
  productId: number,
  imageIds: number[],
): Promise<ProductImage[]> {
  const { data } = await axiosInstance.put<{ data: ProductImage[] }>(
    storePath(storeId, `/products/${productId}/images/order`),
    { image_ids: imageIds },
  );
  return data.data;
}

export type ReorderProductImagesMutationParams = { productId: number; imageIds: number[] };

export function useReorderProductImagesMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, imageIds }: ReorderProductImagesMutationParams) =>
      reorderProductImages(store.id, productId, imageIds),
    onSuccess: async (_images, { productId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.product(store.id, productId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) }),
      ]);
    },
  });
}
