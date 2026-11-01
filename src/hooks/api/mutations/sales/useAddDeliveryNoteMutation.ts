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

export type AddDeliveryNoteMutationParams = { note: string };

export async function addDeliveryNote(
  storeId: number,
  deliveryId: number,
  body: AddDeliveryNoteMutationParams,
): Promise<Delivery> {
  const { data } = await axiosInstance.post<{ data: Delivery }>(
    storePath(storeId, `/deliveries/${deliveryId}/notes`),
    body,
  );
  return data.data;
}

export function useAddDeliveryNoteMutation(deliveryId: number) {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: (params: AddDeliveryNoteMutationParams) =>
      addDeliveryNote(store.id, deliveryId, params),
    onSuccess: (delivery) => {
      storeDeliveryResponse(queryClient, store.id, delivery);
      showToast({ title: 'Note added', description: delivery.order_reference });
    },
    // The dialog shows the error.
    onError: (error) => refetchDeliveryOnConflict(queryClient, store.id, deliveryId, error),
  });
}
