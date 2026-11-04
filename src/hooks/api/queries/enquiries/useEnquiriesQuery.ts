import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';

import { type Paginated } from '@/types/catalogue';
import { type Enquiry } from '@/types/enquiry';
import { queryKeys, type EnquiryListFilters } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export const ENQUIRIES_PER_PAGE = 25;
export const ENQUIRIES_REFETCH_INTERVAL_MILLISECONDS = 60_000;

export async function getEnquiries(
  storeId: number,
  filters: EnquiryListFilters,
): Promise<Paginated<Enquiry>> {
  const { data } = await axiosInstance.get<Paginated<Enquiry>>(storePath(storeId, '/enquiries'), {
    params: {
      status: filters.status,
      q: filters.search || undefined,
      page: filters.page,
      per_page: filters.perPage ?? ENQUIRIES_PER_PAGE,
    },
  });
  return data;
}

export function enquiriesQueryOptions(storeId: number, filters: EnquiryListFilters) {
  return queryOptions({
    queryKey: queryKeys.enquiryList(storeId, filters),
    queryFn: () => getEnquiries(storeId, filters),
  });
}

export function useEnquiriesQuery(filters: EnquiryListFilters) {
  const { store } = useAuthedSession();
  return useQuery({
    ...enquiriesQueryOptions(store.id, filters),
    placeholderData: keepPreviousData,
    refetchInterval: ENQUIRIES_REFETCH_INTERVAL_MILLISECONDS,
    refetchOnWindowFocus: 'always',
  });
}
