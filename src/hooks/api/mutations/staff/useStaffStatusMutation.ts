import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type StaffMember } from '@/types/staff';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';
import { storeStaffMemberResponse } from '@/utils/staffCache';

export type StaffStatusMutationParams = {
  memberId: number;
  action: 'deactivate' | 'reactivate';
};

// Errors are not handled here: the confirmation dialog shows them.
export function useStaffStatusMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async ({ memberId, action }: StaffStatusMutationParams) => {
      const { data } = await axiosInstance.post<{ data: StaffMember }>(
        storePath(store.id, `/staff/${memberId}/${action}`),
      );
      return data.data;
    },
    onSuccess: async (member, { action }) => {
      await storeStaffMemberResponse(queryClient, store.id, member);
      showToast({
        title: `${member.name} ${action === 'deactivate' ? 'deactivated' : 'reactivated'}`,
      });
    },
  });
}
