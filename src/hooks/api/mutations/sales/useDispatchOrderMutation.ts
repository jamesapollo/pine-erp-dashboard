import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type Order } from '@/types/sales';
import {
  refetchOrderOnConflict,
  storeOrderResponse,
} from '@/hooks/api/mutations/sales/useConfirmOrderMutation';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function dispatchOrder(storeId: number, orderId: number): Promise<Order> {
  const { data } = await axiosInstance.post<{ data: Order }>(
    storePath(storeId, `/orders/${orderId}/dispatch`),
  );
  return data.data;
}

// Errors are shown in the dispatch dialog, so there is no error toast here.
export function useDispatchOrderMutation(orderId: number) {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: () => dispatchOrder(store.id, orderId),
    onSuccess: (order) => {
      storeOrderResponse(queryClient, store.id, order);
      showToast({ title: 'Order dispatched', description: order.reference });
    },
    onError: (error) => refetchOrderOnConflict(queryClient, store.id, orderId, error),
  });
}
