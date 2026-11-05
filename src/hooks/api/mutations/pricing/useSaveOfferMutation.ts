import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type Offer, type OfferType } from '@/types/pricing';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export type SaveOfferMutationParams = {
  // Without an offer id the offer is created; with one it is updated.
  offerId?: number;
  // Variant targets are never sent, so an update keeps the ones chosen elsewhere.
  body: {
    name: string;
    type: OfferType;
    value: string;
    starts_at: string;
    ends_at: string;
    is_active: boolean;
    category_ids: number[];
    product_ids: number[];
  };
};

// Errors are not handled here: the editor shows the API's messages under their fields.
export function useSaveOfferMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async ({ offerId, body }: SaveOfferMutationParams) => {
      const path = storePath(store.id, offerId === undefined ? '/offers' : `/offers/${offerId}`);
      const { data } =
        offerId === undefined
          ? await axiosInstance.post<{ data: Offer }>(path, body)
          : await axiosInstance.patch<{ data: Offer }>(path, body);
      return data.data;
    },
    onSuccess: (offer, { offerId }) => {
      queryClient.setQueryData(queryKeys.offer(store.id, offer.id), offer);
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.offers(store.id), 'list'] });
      // The discounted prices show on the products' variants.
      void queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) });
      showToast({
        title: offerId === undefined ? 'Offer created' : 'Offer saved',
        description: offer.name,
      });
    },
  });
}
