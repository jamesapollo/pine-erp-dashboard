import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type StaffMember } from '@/types/staff';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';
import { invalidateTeamQueries } from '@/utils/staffCache';

// Errors are not handled here: the confirmation dialog shows them.
export function useSendStaffPasswordResetMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async (member: StaffMember) => {
      await axiosInstance.post(storePath(store.id, `/staff/${member.id}/password-reset`));
    },
    onSuccess: async (_result, member) => {
      await invalidateTeamQueries(queryClient, store.id);
      showToast({ title: `Reset link sent to ${member.email}` });
    },
  });
}
