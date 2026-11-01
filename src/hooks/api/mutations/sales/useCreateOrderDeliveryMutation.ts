import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type DeliveryMethod, type Order } from '@/types/sales';
import {
  refetchOrderOnConflict,
  storeOrderResponse,
} from '@/hooks/api/mutations/sales/useConfirmOrderMutation';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

// A pickup carries no courier or tracking number.
export type CreateOrderDeliveryMutationParams = {
  method: DeliveryMethod;
  courier_id?: number;
  tracking_number?: string;
};

export async function createOrderDelivery(
  storeId: number,
  orderId: number,
  body: CreateOrderDeliveryMutationParams,
): Promise<Order> {
  const { data } = await axiosInstance.post<{ data: Order }>(
    storePath(storeId, `/orders/${orderId}/delivery`),
    body,
  );
  return data.data;
}

// The first half of dispatching: errors are shown in the dispatch dialog, and there is no toast.
export function useCreateOrderDeliveryMutation(orderId: number) {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateOrderDeliveryMutationParams) =>
      createOrderDelivery(store.id, orderId, params),
    onSuccess: (order) => storeOrderResponse(queryClient, store.id, order),
    onError: (error) => refetchOrderOnConflict(queryClient, store.id, orderId, error),
  });
}
