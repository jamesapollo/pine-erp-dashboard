import { queryOptions, useQuery } from '@tanstack/react-query';

import { type Role } from '@/types/staff';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function getRoles(storeId: number): Promise<Role[]> {
  const { data } = await axiosInstance.get<{ data: Role[] }>(storePath(storeId, '/roles'));
  return data.data;
}

export function rolesQueryOptions(storeId: number) {
  return queryOptions({
    queryKey: queryKeys.roles(storeId),
    queryFn: () => getRoles(storeId),
  });
}

export function useRolesQuery() {
  const { store } = useAuthedSession();
  return useQuery(rolesQueryOptions(store.id));
}
