import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type Product } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function publishProduct(storeId: number, productId: number): Promise<Product> {
  const { data } = await axiosInstance.post<{ data: Product }>(
    storePath(storeId, `/products/${productId}/publish`),
  );
  return data.data;
}

export function usePublishProductMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: (productId: number) => publishProduct(store.id, productId),
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) });
      showToast({ title: 'Product published', description: product.title });
    },
    onError: (error) => {
      showToast({ title: getActionErrorMessage(error), tone: 'danger' });
    },
  });
}
