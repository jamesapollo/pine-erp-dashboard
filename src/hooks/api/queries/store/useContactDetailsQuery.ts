import { queryOptions, useQuery } from '@tanstack/react-query';

import { type ContactDetails } from '@/types/contactDetails';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export function contactDetailsQueryOptions(storeId: number) {
  return queryOptions({
    queryKey: queryKeys.contactDetails(storeId),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: ContactDetails }>(
        storePath(storeId, '/contact-details'),
      );
      return data.data;
    },
  });
}

export function useContactDetailsQuery() {
  const { store } = useAuthedSession();
  return useQuery(contactDetailsQueryOptions(store.id));
}
