import { type QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/api/queryKeys';

// Every enquiry write can change the list, the open message and the sidebar's new-message count,
// and all three share this prefix.
export function invalidateEnquiries(queryClient: QueryClient, storeId: number): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.enquiries(storeId) });
}
