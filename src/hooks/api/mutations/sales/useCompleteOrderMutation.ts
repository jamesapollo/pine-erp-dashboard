import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type Order } from '@/types/sales';
import {
  refetchOrderOnConflict,
  storeOrderResponse,
} from '@/hooks/api/mutations/sales/useConfirmOrderMutation';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function completeOrder(storeId: number, orderId: number): Promise<Order> {
  const { data } = await axiosInstance.post<{ data: Order }>(
    storePath(storeId, `/orders/${orderId}/complete`),
  );
  return data.data;
}

export function useCompleteOrderMutation(orderId: number) {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: () => completeOrder(store.id, orderId),
    onSuccess: (order) => {
      storeOrderResponse(queryClient, store.id, order);
      showToast({ title: 'Order completed', description: order.reference });
    },
    // A header action has nowhere else to show its error.
    onError: (error) => {
      refetchOrderOnConflict(queryClient, store.id, orderId, error);
      showToast({ title: getActionErrorMessage(error), tone: 'danger' });
    },
  });
}
