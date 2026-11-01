import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { type Delivery } from '@/types/sales';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { isStatus } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

/**
 * Puts a delivery the API just returned into its detail cache and marks the store's delivery
 * lists, its order and the order lists stale (the order embeds the delivery).
 */
export function storeDeliveryResponse(
  queryClient: QueryClient,
  storeId: number,
  delivery: Delivery,
): void {
  queryClient.setQueryData(queryKeys.delivery(storeId, delivery.id), delivery);
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.deliveries(storeId), 'list'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.order(storeId, delivery.order_id) });
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.orders(storeId), 'list'] });
}

// A null clears the field.
export type UpdateDeliveryTrackingMutationParams = {
  courier_id: number | null;
  tracking_number: string | null;
};

export async function updateDeliveryTracking(
  storeId: number,
  deliveryId: number,
  body: UpdateDeliveryTrackingMutationParams,
): Promise<Delivery> {
  const { data } = await axiosInstance.patch<{ data: Delivery }>(
    storePath(storeId, `/deliveries/${deliveryId}/tracking`),
    body,
  );
  return data.data;
}

// Errors are shown where the edit happened. A 409 means the delivery moved on, so load it (and
// the orders that embed it) again.
export function useUpdateDeliveryTrackingMutation(deliveryId: number) {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: UpdateDeliveryTrackingMutationParams) =>
      updateDeliveryTracking(store.id, deliveryId, params),
    onSuccess: (delivery) => storeDeliveryResponse(queryClient, store.id, delivery),
    onError: (error) => {
      if (!isStatus(error, 409)) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.delivery(store.id, deliveryId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders(store.id) });
    },
  });
}
