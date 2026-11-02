import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type StaffMember } from '@/types/staff';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export type InviteStaffMutationParams = { email: string; roleId: number };

// Errors are not handled here: the invite dialog shows the API's messages under its fields.
export function useInviteStaffMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async ({ email, roleId }: InviteStaffMutationParams) => {
      const { data } = await axiosInstance.post<{ data: StaffMember }>(
        storePath(store.id, '/staff/invitations'),
        { email, role_id: roleId },
      );
      return data.data;
    },
    onSuccess: async (_member, { email }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.staff(store.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.roles(store.id) }),
      ]);
      showToast({ title: `Invite sent to ${email}` });
    },
  });
}
