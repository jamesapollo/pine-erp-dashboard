import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type DeliveryZone } from '@/types/sales';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function deleteDeliveryZone(storeId: number, zoneId: number): Promise<void> {
  await axiosInstance.delete(storePath(storeId, `/delivery-zones/${zoneId}`));
}

// Errors are shown in the delete dialog, so there is no error toast here.
export function useDeleteDeliveryZoneMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: (zone: DeliveryZone) => deleteDeliveryZone(store.id, zone.id),
    onSuccess: (_result, zone) => {
      queryClient.setQueryData<DeliveryZone[]>(queryKeys.deliveryZones(store.id), (zones) =>
        zones?.filter((candidate) => candidate.id !== zone.id),
      );
      showToast({ title: 'Zone deleted', description: zone.name });
      void queryClient.invalidateQueries({ queryKey: queryKeys.deliveryZones(store.id) });
    },
  });
}
