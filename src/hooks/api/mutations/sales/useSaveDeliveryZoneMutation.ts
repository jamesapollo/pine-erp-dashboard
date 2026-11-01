import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { type DeliveryZone } from '@/types/sales';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export type DeliveryZoneBody = {
  country?: string;
  name?: string;
  /** A two-decimal string, such as "350.00". */
  fee?: string;
  is_active?: boolean;
  sort_order?: number;
};

export async function createDeliveryZone(
  storeId: number,
  body: DeliveryZoneBody,
): Promise<DeliveryZone> {
  const { data } = await axiosInstance.post<{ data: DeliveryZone }>(
    storePath(storeId, '/delivery-zones'),
    body,
  );
  return data.data;
}

export async function updateDeliveryZone(
  storeId: number,
  zoneId: number,
  body: DeliveryZoneBody,
): Promise<DeliveryZone> {
  const { data } = await axiosInstance.patch<{ data: DeliveryZone }>(
    storePath(storeId, `/delivery-zones/${zoneId}`),
    body,
  );
  return data.data;
}

/** Put the saved zone into the cached list, so the screen updates before the list reloads. */
export function storeDeliveryZoneResponse(
  queryClient: QueryClient,
  storeId: number,
  zone: DeliveryZone,
): void {
  queryClient.setQueryData<DeliveryZone[]>(queryKeys.deliveryZones(storeId), (zones) => {
    if (!zones) return zones;
    return zones.some((candidate) => candidate.id === zone.id)
      ? zones.map((candidate) => (candidate.id === zone.id ? zone : candidate))
      : [...zones, zone];
  });
}

export type SaveDeliveryZoneMutationParams = {
  /** Absent to add a zone. */
  zoneId?: number;
  body: DeliveryZoneBody;
  /** The toast title, such as "Zone added" or "Zone switched off". */
  successTitle: string;
};

// Errors are shown where the save happened (the zone dialog, or a toast for the switch).
export function useSaveDeliveryZoneMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: ({ zoneId, body }: SaveDeliveryZoneMutationParams) =>
      zoneId === undefined
        ? createDeliveryZone(store.id, body)
        : updateDeliveryZone(store.id, zoneId, body),
    onSuccess: (zone, { successTitle }) => {
      storeDeliveryZoneResponse(queryClient, store.id, zone);
      showToast({ title: successTitle, description: zone.name });
      void queryClient.invalidateQueries({ queryKey: queryKeys.deliveryZones(store.id) });
    },
  });
}
