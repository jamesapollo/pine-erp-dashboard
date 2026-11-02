import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type StaffMember } from '@/types/staff';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';
import { refreshAfterStaffMemberGone } from '@/utils/staffCache';

// Errors are not handled here: the confirmation dialog shows them.
export function useRemoveStaffMemberMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async (member: StaffMember) => {
      await axiosInstance.delete(storePath(store.id, `/staff/${member.id}`));
    },
    onSuccess: async (_result, member) => {
      await refreshAfterStaffMemberGone(queryClient, store.id, member.id);
      showToast({ title: `${member.name} removed` });
    },
  });
}
