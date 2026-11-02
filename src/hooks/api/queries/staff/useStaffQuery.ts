import { queryOptions, useQuery } from '@tanstack/react-query';

import { type StaffMember } from '@/types/staff';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

/** Everyone on the store's team, including people who are invited or deactivated. */
export async function getStaff(storeId: number): Promise<StaffMember[]> {
  const { data } = await axiosInstance.get<{ data: StaffMember[] }>(storePath(storeId, '/staff'));
  return data.data;
}

export function staffQueryOptions(storeId: number) {
  return queryOptions({
    queryKey: queryKeys.staff(storeId),
    queryFn: () => getStaff(storeId),
    // Last active and invitation status move without any action here.
    refetchOnMount: 'always',
  });
}

export function useStaffQuery() {
  const { store } = useAuthedSession();
  return useQuery(staffQueryOptions(store.id));
}
