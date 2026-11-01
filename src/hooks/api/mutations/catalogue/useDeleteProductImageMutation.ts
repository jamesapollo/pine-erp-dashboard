import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function deleteProductImage(
  storeId: number,
  productId: number,
  imageId: number,
): Promise<void> {
  await axiosInstance.delete(storePath(storeId, `/products/${productId}/images/${imageId}`));
}

export type DeleteProductImageMutationParams = { productId: number; imageId: number };

export function useDeleteProductImageMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, imageId }: DeleteProductImageMutationParams) =>
      deleteProductImage(store.id, productId, imageId),
    onSuccess: async (_result, { productId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.product(store.id, productId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) }),
      ]);
    },
  });
}
