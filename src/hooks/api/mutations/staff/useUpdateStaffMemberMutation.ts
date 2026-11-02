import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type StaffMember } from '@/types/staff';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';
import { storeStaffMemberResponse } from '@/utils/staffCache';

export type UpdateStaffMemberMutationParams = {
  memberId: number;
  changes: { name: string } | { roleId: number };
};

// Errors are not handled here: the cards show them where the change was made.
export function useUpdateStaffMemberMutation() {
  const { store, user } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async ({ memberId, changes }: UpdateStaffMemberMutationParams) => {
      const body = 'name' in changes ? { name: changes.name } : { role_id: changes.roleId };
      const { data } = await axiosInstance.patch<{ data: StaffMember }>(
        storePath(store.id, `/staff/${memberId}`),
        body,
      );
      return data.data;
    },
    onSuccess: async (member, { changes }) => {
      await Promise.all([
        storeStaffMemberResponse(queryClient, store.id, member),
        // The sidebar shows the signed-in person's name from the session, so a rename of themselves
        // reloads it.
        member.user_id === user.id
          ? queryClient.invalidateQueries({ queryKey: queryKeys.me })
          : undefined,
      ]);
      showToast({ title: 'name' in changes ? 'Name saved' : 'Role changed' });
    },
  });
}
