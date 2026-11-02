import { queryOptions, useQuery } from '@tanstack/react-query';

import { type RoleDetail } from '@/types/staff';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function getRole(storeId: number, roleId: number): Promise<RoleDetail> {
  const { data } = await axiosInstance.get<{ data: RoleDetail }>(
    storePath(storeId, `/roles/${roleId}`),
  );
  return data.data;
}

export function roleQueryOptions(storeId: number, roleId: number) {
  return queryOptions({
    queryKey: queryKeys.role(storeId, roleId),
    queryFn: () => getRole(storeId, roleId),
  });
}

// A non-positive or non-integer id (such as NaN from a bad URL) never sends a request.
export function useRoleQuery(roleId: number) {
  const { store } = useAuthedSession();
  return useQuery({
    ...roleQueryOptions(store.id, roleId),
    enabled: Number.isInteger(roleId) && roleId > 0,
    // Members move between roles from the Staff screens.
    refetchOnMount: 'always',
  });
}
