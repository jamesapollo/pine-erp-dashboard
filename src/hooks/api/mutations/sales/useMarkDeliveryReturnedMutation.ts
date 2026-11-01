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

export async function markDeliveryReturned(storeId: number, deliveryId: number): Promise<Delivery> {
  const { data } = await axiosInstance.post<{ data: Delivery }>(
    storePath(storeId, `/deliveries/${deliveryId}/returned`),
  );
  return data.data;
}

export function useMarkDeliveryReturnedMutation(deliveryId: number) {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: () => markDeliveryReturned(store.id, deliveryId),
    onSuccess: (delivery) => {
      storeDeliveryResponse(queryClient, store.id, delivery);
      showToast({ title: 'Marked returned', description: delivery.order_reference });
    },
    // The dialog shows the error.
    onError: (error) => refetchDeliveryOnConflict(queryClient, store.id, deliveryId, error),
  });
}
