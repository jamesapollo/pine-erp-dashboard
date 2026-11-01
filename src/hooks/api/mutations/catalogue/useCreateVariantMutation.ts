import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type ProductVariant } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

// `price` requires pricing.manage: leave the key out entirely when the user can't set prices.
export type CreateVariantBody = { option_value_ids: number[]; price?: string };

export async function createVariant(
  storeId: number,
  productId: number,
  body: CreateVariantBody,
): Promise<ProductVariant> {
  const { data } = await axiosInstance.post<{ data: ProductVariant }>(
    storePath(storeId, `/products/${productId}/variants`),
    body,
  );
  return data.data;
}

export type CreateVariantMutationParams = { productId: number; body: CreateVariantBody };

export function useCreateVariantMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: ({ productId, body }: CreateVariantMutationParams) =>
      createVariant(store.id, productId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) });
    },
    onError: (error) => {
      showToast({ title: getActionErrorMessage(error), tone: 'danger' });
    },
  });
}
