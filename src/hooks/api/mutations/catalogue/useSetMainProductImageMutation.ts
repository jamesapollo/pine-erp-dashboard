import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type ProductImage } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function setMainProductImage(
  storeId: number,
  productId: number,
  imageId: number,
): Promise<ProductImage> {
  const { data } = await axiosInstance.post<{ data: ProductImage }>(
    storePath(storeId, `/products/${productId}/images/${imageId}/main`),
  );
  return data.data;
}

export type SetMainProductImageMutationParams = { productId: number; imageId: number };

export function useSetMainProductImageMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, imageId }: SetMainProductImageMutationParams) =>
      setMainProductImage(store.id, productId, imageId),
    onSuccess: async (_image, { productId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.product(store.id, productId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) }),
      ]);
    },
  });
}
