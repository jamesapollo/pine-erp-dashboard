import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type Offer } from '@/types/pricing';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

// Errors are not handled here: the confirmation dialog shows them. The deleted offer's own detail is
// left in the cache, so the screen showing it does not reload into a 404 before the caller navigates
// away; the caller removes it afterwards with `queryKeys.offer`.
export function useDeleteOfferMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async (offer: Offer) => {
      await axiosInstance.delete(storePath(store.id, `/offers/${offer.id}`));
    },
    onSuccess: (_, offer) => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.offers(store.id), 'list'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) });
      showToast({ title: 'Offer deleted', description: offer.name });
    },
  });
}
