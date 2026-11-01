import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { type Order } from '@/types/sales';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { getActionErrorMessage, isStatus } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

/**
 * Puts an order the API just returned into its detail cache and marks the store's order lists
 * (with their counts) and deliveries stale. The detail query keeps the response as it is.
 */
export function storeOrderResponse(queryClient: QueryClient, storeId: number, order: Order): void {
  queryClient.setQueryData(queryKeys.order(storeId, order.id), order);
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.orders(storeId), 'list'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.deliveries(storeId) });
}

/** Confirming and cancelling move stock, so the store's products and stock history go stale. */
export function invalidateStockQueries(queryClient: QueryClient, storeId: number): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.products(storeId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.allStockMovements(storeId) });
}

/** A 409 means the order moved under us (or its hold ran out), so load it again. */
export function refetchOrderOnConflict(
  queryClient: QueryClient,
  storeId: number,
  orderId: number,
  error: unknown,
): void {
  if (!isStatus(error, 409)) return;
  void queryClient.invalidateQueries({ queryKey: queryKeys.order(storeId, orderId) });
}

export async function confirmOrder(storeId: number, orderId: number): Promise<Order> {
  const { data } = await axiosInstance.post<{ data: Order }>(
    storePath(storeId, `/orders/${orderId}/confirm`),
  );
  return data.data;
}

export function useConfirmOrderMutation(orderId: number) {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: () => confirmOrder(store.id, orderId),
    onSuccess: (order) => {
      storeOrderResponse(queryClient, store.id, order);
      invalidateStockQueries(queryClient, store.id);
      showToast({ title: 'Order confirmed', description: order.reference });
    },
    // A header action has nowhere else to show its error.
    onError: (error) => {
      refetchOrderOnConflict(queryClient, store.id, orderId, error);
      showToast({ title: getActionErrorMessage(error), tone: 'danger' });
    },
  });
}
