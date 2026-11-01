import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type Order } from '@/types/sales';
import {
  invalidateStockQueries,
  refetchOrderOnConflict,
  storeOrderResponse,
} from '@/hooks/api/mutations/sales/useConfirmOrderMutation';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export type CancelOrderMutationParams = { reason: string };

export async function cancelOrder(
  storeId: number,
  orderId: number,
  body: CancelOrderMutationParams,
): Promise<Order> {
  const { data } = await axiosInstance.post<{ data: Order }>(
    storePath(storeId, `/orders/${orderId}/cancel`),
    body,
  );
  return data.data;
}

// Errors are shown in the cancel dialog, so there is no error toast here.
export function useCancelOrderMutation(orderId: number) {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: (params: CancelOrderMutationParams) => cancelOrder(store.id, orderId, params),
    onSuccess: (order) => {
      storeOrderResponse(queryClient, store.id, order);
      invalidateStockQueries(queryClient, store.id);
      showToast({ title: 'Order cancelled', description: order.reference });
    },
    onError: (error) => refetchOrderOnConflict(queryClient, store.id, orderId, error),
  });
}
