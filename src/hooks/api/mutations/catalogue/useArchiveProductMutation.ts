import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type Product } from '@/types/catalogue';
import { storeProductResponse } from '@/hooks/api/mutations/catalogue/useUpdateProductMutation';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function archiveProduct(storeId: number, productId: number): Promise<Product> {
  const { data } = await axiosInstance.post<{ data: Product }>(
    storePath(storeId, `/products/${productId}/archive`),
  );
  return data.data;
}

export function useArchiveProductMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: (productId: number) => archiveProduct(store.id, productId),
    onSuccess: async (product) => {
      await storeProductResponse(queryClient, store.id, product);
      showToast({ title: 'Product archived', description: product.title });
    },
  });
}
