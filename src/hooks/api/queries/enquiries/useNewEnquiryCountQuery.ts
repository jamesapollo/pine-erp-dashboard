import { useQuery } from '@tanstack/react-query';

import {
  ENQUIRIES_REFETCH_INTERVAL_MILLISECONDS,
  getEnquiries,
} from '@/hooks/api/queries/enquiries/useEnquiriesQuery';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';

// The number of messages nobody has answered yet, for the sidebar badge.
export function useNewEnquiryCountQuery({ enabled }: { enabled: boolean }): number | undefined {
  const { store } = useAuthedSession();
  const { data } = useQuery({
    queryKey: queryKeys.newEnquiryCount(store.id),
    queryFn: () => getEnquiries(store.id, { status: 'new', perPage: 1 }),
    enabled,
    refetchInterval: ENQUIRIES_REFETCH_INTERVAL_MILLISECONDS,
    refetchOnWindowFocus: 'always',
  });
  return data?.meta.total;
}
