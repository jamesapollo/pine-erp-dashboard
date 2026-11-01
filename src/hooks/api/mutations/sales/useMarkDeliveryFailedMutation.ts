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

export type MarkDeliveryFailedMutationParams = { reason: string };

export async function markDeliveryFailed(
  storeId: number,
  deliveryId: number,
  body: MarkDeliveryFailedMutationParams,
): Promise<Delivery> {
  const { data } = await axiosInstance.post<{ data: Delivery }>(
    storePath(storeId, `/deliveries/${deliveryId}/failed`),
    body,
  );
  return data.data;
}

export function useMarkDeliveryFailedMutation(deliveryId: number) {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: (params: MarkDeliveryFailedMutationParams) =>
      markDeliveryFailed(store.id, deliveryId, params),
    onSuccess: (delivery) => {
      storeDeliveryResponse(queryClient, store.id, delivery);
      showToast({ title: 'Marked failed', description: delivery.order_reference });
    },
    // The dialog shows the error.
    onError: (error) => refetchDeliveryOnConflict(queryClient, store.id, deliveryId, error),
  });
}
