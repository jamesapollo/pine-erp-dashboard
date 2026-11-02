import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';
import { refreshAfterStaffMemberGone } from '@/utils/staffCache';

// Errors are not handled here: the confirmation dialog shows them.
export function useRevokeInvitationMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async (memberId: number) => {
      await axiosInstance.delete(storePath(store.id, `/staff/${memberId}/invitation`));
    },
    onSuccess: async (_result, memberId) => {
      await refreshAfterStaffMemberGone(queryClient, store.id, memberId);
      showToast({ title: 'Invite revoked' });
    },
  });
}
