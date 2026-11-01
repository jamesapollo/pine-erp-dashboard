import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type Product } from '@/types/catalogue';
import { storeProductResponse } from '@/hooks/api/mutations/catalogue/useUpdateProductMutation';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

// Moves a published or archived product back to draft; on an archived product this is "Restore".
export async function unpublishProduct(storeId: number, productId: number): Promise<Product> {
  const { data } = await axiosInstance.post<{ data: Product }>(
    storePath(storeId, `/products/${productId}/unpublish`),
  );
  return data.data;
}

export type UnpublishProductMutationParams = { productId: number; isRestoring: boolean };

export function useUnpublishProductMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: ({ productId }: UnpublishProductMutationParams) =>
      unpublishProduct(store.id, productId),
    onSuccess: async (product, { isRestoring }) => {
      await storeProductResponse(queryClient, store.id, product);
      showToast({
        title: isRestoring ? 'Product restored to draft' : 'Product unpublished',
        description: product.title,
      });
    },
  });
}
