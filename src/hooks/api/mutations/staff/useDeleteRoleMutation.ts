import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type RoleDetail } from '@/types/staff';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

// Errors are not handled here: the confirmation dialog shows them. The deleted role's own detail is
// left in the cache, so the screen showing it does not reload into a 404 before the caller navigates
// away; the caller removes it afterwards with `queryKeys.role`.
export function useDeleteRoleMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async (role: RoleDetail) => {
      await axiosInstance.delete(storePath(store.id, `/roles/${role.id}`));
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.roles(store.id), exact: true }),
        queryClient.invalidateQueries({ queryKey: queryKeys.staff(store.id) }),
      ]);
      showToast({ title: 'Role deleted' });
    },
  });
}
