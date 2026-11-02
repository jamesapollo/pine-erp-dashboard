import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type Role, type RoleDetail } from '@/types/staff';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export type SaveRoleMutationParams = {
  // Without a role id the role is created; with one it is updated.
  roleId?: number;
  body: { name?: string; description?: string; permissions?: string[] };
};

// Errors are not handled here: the screens show the API's messages under their fields.
export function useSaveRoleMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async ({ roleId, body }: SaveRoleMutationParams) => {
      const path = storePath(store.id, roleId === undefined ? '/roles' : `/roles/${roleId}`);
      const { data } =
        roleId === undefined
          ? await axiosInstance.post<{ data: Role }>(path, body)
          : await axiosInstance.patch<{ data: Role }>(path, body);
      return data.data;
    },
    onSuccess: (role, { roleId }) => {
      // The answer has no members, so an update keeps the cached detail's; a new role has none cached.
      if (roleId !== undefined) {
        queryClient.setQueryData<RoleDetail>(queryKeys.role(store.id, role.id), (previous) =>
          previous ? { ...previous, ...role } : previous,
        );
      }
      // Not awaited: the list refreshes in the background while the caller carries on.
      void queryClient.invalidateQueries({ queryKey: queryKeys.roles(store.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff(store.id) });
      showToast({ title: roleId === undefined ? 'Role created' : 'Role saved' });
    },
  });
}
