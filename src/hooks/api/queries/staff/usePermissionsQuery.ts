import { queryOptions, useQuery } from '@tanstack/react-query';

import { type Permission } from '@/types/staff';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function getPermissions(storeId: number): Promise<Permission[]> {
  const { data } = await axiosInstance.get<{ data: Permission[] }>(
    storePath(storeId, '/permissions'),
  );
  return data.data;
}

export function permissionsQueryOptions(storeId: number) {
  return queryOptions({
    queryKey: queryKeys.permissions(storeId),
    queryFn: () => getPermissions(storeId),
  });
}

export function usePermissionsQuery() {
  const { store } = useAuthedSession();
  return useQuery(permissionsQueryOptions(store.id));
}
