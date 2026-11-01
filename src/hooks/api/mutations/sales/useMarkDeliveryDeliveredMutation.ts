import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type Delivery } from '@/types/sales';
import {
  refetchDeliveryOnConflict,
  storeDeliveryResponse,
} from '@/hooks/api/mutations/sales/useUpdateDeliveryTrackingMutation';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function markDeliveryDelivered(
  storeId: number,
  deliveryId: number,
): Promise<Delivery> {
  const { data } = await axiosInstance.post<{ data: Delivery }>(
    storePath(storeId, `/deliveries/${deliveryId}/delivered`),
  );
  return data.data;
}

export function useMarkDeliveryDeliveredMutation(deliveryId: number) {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: () => markDeliveryDelivered(store.id, deliveryId),
    onSuccess: (delivery) => {
      storeDeliveryResponse(queryClient, store.id, delivery);
      showToast({
        title: delivery.method === 'pickup' ? 'Marked collected' : 'Marked delivered',
        description: delivery.order_reference,
      });
    },
    // A header action has nowhere else to show its error.
    onError: (error) => {
      refetchDeliveryOnConflict(queryClient, store.id, deliveryId, error);
      showToast({ title: getActionErrorMessage(error), tone: 'danger' });
    },
  });
}
