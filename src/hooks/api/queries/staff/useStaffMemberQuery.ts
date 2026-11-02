import { queryOptions, useQuery } from '@tanstack/react-query';

import { type StaffMember } from '@/types/staff';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function getStaffMember(storeId: number, memberId: number): Promise<StaffMember> {
  const { data } = await axiosInstance.get<{ data: StaffMember }>(
    storePath(storeId, `/staff/${memberId}`),
  );
  return data.data;
}

export function staffMemberQueryOptions(storeId: number, memberId: number) {
  return queryOptions({
    queryKey: queryKeys.staffMember(storeId, memberId),
    queryFn: () => getStaffMember(storeId, memberId),
  });
}

// A non-positive or non-integer id (such as NaN from a bad URL) never sends a request.
export function useStaffMemberQuery(memberId: number) {
  const { store } = useAuthedSession();
  return useQuery({
    ...staffMemberQueryOptions(store.id, memberId),
    enabled: Number.isInteger(memberId) && memberId > 0,
    // Last active and invitation status move without any action here.
    refetchOnMount: 'always',
  });
}
