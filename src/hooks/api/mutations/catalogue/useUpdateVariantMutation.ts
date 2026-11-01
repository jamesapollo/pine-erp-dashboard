import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type ProductVariant } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

// `price: null` clears the override so the variant inherits the base price. Any `price` key
// requires pricing.manage.
export type UpdateVariantBody = { price?: string | null; is_active?: boolean };

export async function updateVariant(
  storeId: number,
  productId: number,
  variantId: number,
  body: UpdateVariantBody,
): Promise<ProductVariant> {
  const { data } = await axiosInstance.patch<{ data: ProductVariant }>(
    storePath(storeId, `/products/${productId}/variants/${variantId}`),
    body,
  );
  return data.data;
}

export type UpdateVariantMutationParams = {
  productId: number;
  variantId: number;
  body: UpdateVariantBody;
};

export function useUpdateVariantMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: ({ productId, variantId, body }: UpdateVariantMutationParams) =>
      updateVariant(store.id, productId, variantId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) });
    },
    onError: (error) => {
      showToast({ title: getActionErrorMessage(error), tone: 'danger' });
    },
  });
}
