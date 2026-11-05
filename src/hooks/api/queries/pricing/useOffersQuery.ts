import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';

import { type Paginated } from '@/types/catalogue';
import { type Offer } from '@/types/pricing';
import { queryKeys, type OfferListFilters } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export const OFFERS_PER_PAGE = 25;

export async function getOffers(
  storeId: number,
  filters: OfferListFilters,
): Promise<Paginated<Offer>> {
  const { data } = await axiosInstance.get<Paginated<Offer>>(storePath(storeId, '/offers'), {
    params: {
      status: filters.status,
      q: filters.search || undefined,
      page: filters.page,
      per_page: filters.perPage ?? OFFERS_PER_PAGE,
    },
  });
  return data;
}

export function offersQueryOptions(storeId: number, filters: OfferListFilters) {
  return queryOptions({
    queryKey: queryKeys.offerList(storeId, filters),
    queryFn: () => getOffers(storeId, filters),
  });
}

export function useOffersQuery(filters: OfferListFilters) {
  const { store } = useAuthedSession();
  return useQuery({
    ...offersQueryOptions(store.id, filters),
    placeholderData: keepPreviousData,
    // Offers start and end on their own, so a cached status can be out of date.
    refetchOnMount: 'always',
  });
}
