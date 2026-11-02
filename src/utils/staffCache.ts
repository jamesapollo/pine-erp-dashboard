import { type QueryClient } from '@tanstack/react-query';

import { type StaffMember } from '@/types/staff';
import { queryKeys } from '@/hooks/api/queryKeys';

/** Refreshes the team list, every member's detail and the roles' member counts. */
export function invalidateTeamQueries(queryClient: QueryClient, storeId: number) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.staff(storeId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.roles(storeId) }),
  ]);
}

/** Puts the member the API returned into its detail cache, then refreshes the list and roles. */
export async function storeStaffMemberResponse(
  queryClient: QueryClient,
  storeId: number,
  member: StaffMember,
) {
  queryClient.setQueryData(queryKeys.staffMember(storeId, member.id), member);
  await invalidateTeamQueries(queryClient, storeId);
}

/** For answers with no body: drops the member's detail so the next visit loads it afresh. */
export async function refreshAfterStaffMemberGone(
  queryClient: QueryClient,
  storeId: number,
  memberId: number,
) {
  queryClient.removeQueries({ queryKey: queryKeys.staffMember(storeId, memberId) });
  await invalidateTeamQueries(queryClient, storeId);
}
