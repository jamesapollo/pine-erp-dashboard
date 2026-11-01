import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type Delivery } from '@/types/sales';
import {
  refetchDeliveryOnConflict,
  storeDeliveryResponse,
} from '@/hooks/api/mutations/sales/useUpdateDeliveryTrackingMutation';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

// A field left out keeps the delivery's current courier or tracking number.
export type RetryDeliveryMutationParams = { courier_id?: number; tracking_number?: string };

export async function retryDelivery(
  storeId: number,
  deliveryId: number,
  body: RetryDeliveryMutationParams,
): Promise<Delivery> {
  const { data } = await axiosInstance.post<{ data: Delivery }>(
    storePath(storeId, `/deliveries/${deliveryId}/retry`),
    body,
  );
  return data.data;
}

export function useRetryDeliveryMutation(deliveryId: number) {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: (params: RetryDeliveryMutationParams) =>
      retryDelivery(store.id, deliveryId, params),
    onSuccess: (delivery) => {
      storeDeliveryResponse(queryClient, store.id, delivery);
      showToast({ title: 'Delivery retried', description: delivery.order_reference });
    },
    // The dialog shows the error.
    onError: (error) => refetchDeliveryOnConflict(queryClient, store.id, deliveryId, error),
  });
}
