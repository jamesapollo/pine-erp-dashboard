import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type DeliveryZone } from '@/types/sales';
import { queryKeys } from '@/hooks/api/queryKeys';
import { updateDeliveryZone } from '@/hooks/api/mutations/sales/useSaveDeliveryZoneMutation';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { getActionErrorMessage } from '@/utils/apiErrors';

/**
 * Give one country's zones sort_order 0, 1, 2… in the given order. Only zones whose position
 * changed are sent; the API has no bulk reorder, so it is one PATCH per zone.
 */
export async function reorderDeliveryZones(
  storeId: number,
  orderedZones: DeliveryZone[],
): Promise<void> {
  const changed = orderedZones
    .map((zone, index) => ({ zone, index }))
    .filter(({ zone, index }) => zone.sort_order !== index);
  for (const { zone, index } of changed) {
    await updateDeliveryZone(storeId, zone.id, { sort_order: index });
  }
}

export function useReorderDeliveryZonesMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: (orderedZones: DeliveryZone[]) => reorderDeliveryZones(store.id, orderedZones),
    onMutate: (orderedZones) => {
      // Show the new order straight away; the reload afterwards corrects it if a save failed.
      const positions = new Map(orderedZones.map((zone, index) => [zone.id, index]));
      queryClient.setQueryData<DeliveryZone[]>(queryKeys.deliveryZones(store.id), (zones) =>
        zones
          ?.map((zone) => ({ ...zone, sort_order: positions.get(zone.id) ?? zone.sort_order }))
          .sort(
            (first, second) =>
              first.country.localeCompare(second.country) ||
              first.sort_order - second.sort_order ||
              first.id - second.id,
          ),
      );
    },
    onError: (error) => showToast({ title: getActionErrorMessage(error), tone: 'danger' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.deliveryZones(store.id) }),
  });
}
