import { queryOptions, useQuery } from '@tanstack/react-query';

import { type Offer } from '@/types/pricing';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function getOffer(storeId: number, offerId: number): Promise<Offer> {
  const { data } = await axiosInstance.get<{ data: Offer }>(
    storePath(storeId, `/offers/${offerId}`),
  );
  return data.data;
}

export function offerQueryOptions(storeId: number, offerId: number) {
  return queryOptions({
    queryKey: queryKeys.offer(storeId, offerId),
    queryFn: () => getOffer(storeId, offerId),
  });
}

// A non-positive or non-integer id (such as NaN from a bad URL) never sends a request.
export function useOfferQuery(offerId: number) {
  const { store } = useAuthedSession();
  return useQuery({
    ...offerQueryOptions(store.id, offerId),
    enabled: Number.isInteger(offerId) && offerId > 0,
    refetchOnMount: 'always',
  });
}
