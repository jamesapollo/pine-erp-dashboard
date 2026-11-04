import { queryOptions, useQuery } from '@tanstack/react-query';

import { type EnquiryDetail } from '@/types/enquiry';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function getEnquiry(storeId: number, enquiryId: number): Promise<EnquiryDetail> {
  const { data } = await axiosInstance.get<{ data: EnquiryDetail }>(
    storePath(storeId, `/enquiries/${enquiryId}`),
  );
  return data.data;
}

export function enquiryQueryOptions(storeId: number, enquiryId: number) {
  return queryOptions({
    queryKey: queryKeys.enquiry(storeId, enquiryId),
    queryFn: () => getEnquiry(storeId, enquiryId),
  });
}

// A non-positive or non-integer id (such as NaN from a bad URL) never sends a request.
export function useEnquiryQuery(enquiryId: number) {
  const { store } = useAuthedSession();
  return useQuery({
    ...enquiryQueryOptions(store.id, enquiryId),
    enabled: Number.isInteger(enquiryId) && enquiryId > 0,
    refetchOnWindowFocus: 'always',
    refetchOnMount: 'always',
  });
}
