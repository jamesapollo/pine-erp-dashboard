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

// `amount` is a two-decimal string (`toMoneyInput`); "0.00" means free delivery.
export type SetDeliveryFeeMutationParams = { amount: string };

export async function setDeliveryFee(
  storeId: number,
  orderId: number,
  body: SetDeliveryFeeMutationParams,
): Promise<Order> {
  const { data } = await axiosInstance.put<{ data: Order }>(
    storePath(storeId, `/orders/${orderId}/delivery-fee`),
    body,
  );
  return data.data;
}

// Errors are shown in the fee dialog, so there is no error toast here.
export function useSetDeliveryFeeMutation(orderId: number) {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: (params: SetDeliveryFeeMutationParams) => setDeliveryFee(store.id, orderId, params),
    onSuccess: (order) => {
      storeOrderResponse(queryClient, store.id, order);
      showToast({ title: 'Delivery fee set', description: order.reference });
    },
    onError: (error) => refetchOrderOnConflict(queryClient, store.id, orderId, error),
  });
}
