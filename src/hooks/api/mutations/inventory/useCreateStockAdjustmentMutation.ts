import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type VariantStock } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export type CreateStockAdjustmentBody = {
  variant_id: number;
  type: 'receipt';
  change: number;
  reason: string;
};

export async function createStockAdjustment(
  storeId: number,
  body: CreateStockAdjustmentBody,
): Promise<{ stock: VariantStock }> {
  const { data } = await axiosInstance.post<{ data: { stock: VariantStock } }>(
    storePath(storeId, '/stock-adjustments'),
    body,
  );
  return { stock: data.data.stock };
}

export type CreateStockAdjustmentMutationParams = {
  productId: number;
  body: CreateStockAdjustmentBody;
};

export function useCreateStockAdjustmentMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: ({ body }: CreateStockAdjustmentMutationParams) =>
      createStockAdjustment(store.id, body),
    onSuccess: async (_result, { productId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements(store.id, productId) }),
      ]);
    },
    onError: (error) => {
      showToast({ title: getActionErrorMessage(error), tone: 'danger' });
    },
  });
}
