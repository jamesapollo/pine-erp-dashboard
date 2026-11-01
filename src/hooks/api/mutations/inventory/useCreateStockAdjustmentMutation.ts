import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type StockMovement, type VariantStock } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

/** A change (receipts add, adjustments add or remove) or a count, which only an adjustment can record. */
export type CreateStockAdjustmentBody =
  | { variant_id: number; type: 'receipt' | 'adjustment'; change: number; reason: string }
  | { variant_id: number; type: 'adjustment'; set_to: number; reason: string };

export async function createStockAdjustment(
  storeId: number,
  body: CreateStockAdjustmentBody,
): Promise<{ movement: StockMovement; stock: VariantStock }> {
  const { data } = await axiosInstance.post<{
    data: { movement: StockMovement; stock: VariantStock };
  }>(storePath(storeId, '/stock-adjustments'), body);
  return data.data;
}

export type CreateStockAdjustmentMutationParams = {
  body: CreateStockAdjustmentBody;
  /** "Shirt · M · Red", for the confirmation toast. */
  variantName: string;
};

// Errors are shown in the adjust dialog, so there is no error toast here.
export function useCreateStockAdjustmentMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: ({ body }: CreateStockAdjustmentMutationParams) =>
      createStockAdjustment(store.id, body),
    onSuccess: async ({ movement }, { body, variantName }) => {
      const sign = movement.quantity > 0 ? '+' : '−';
      showToast({
        title: body.type === 'receipt' ? 'Stock received' : 'Stock adjusted',
        description: `${variantName}  ${sign}${Math.abs(movement.quantity)}`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.stockLevels(store.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.allStockMovements(store.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) }),
      ]);
    },
  });
}
