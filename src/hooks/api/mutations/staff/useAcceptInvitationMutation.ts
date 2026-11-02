import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { queryKeys } from '@/hooks/api/queryKeys';
import { axiosInstance, ensureCsrfCookie } from '@/utils/axiosConfig';
import { ROUTES } from '@/constants/routes';

export type AcceptInvitationMutationParams = {
  token: string;
  // Only a person who has no password yet sends these; someone with an account accepts while signed in.
  body?: { name: string; password: string; password_confirmation: string };
};

async function acceptInvitation({ token, body }: AcceptInvitationMutationParams): Promise<void> {
  await ensureCsrfCookie();
  await axiosInstance.post(`/api/v1/invitations/${encodeURIComponent(token)}/accept`, body);
}

export function useAcceptInvitationMutation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: async (_data, { token }) => {
      // A new person is now signed in, and a returning one has a new store: reload the session first,
      // so the overview does not bounce them to sign-in.
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      // Navigate from here, not from the screen: the screen may unmount before this finishes.
      void navigate(ROUTES.ROOT, { replace: true });
      // The link is used up; a later visit loads it fresh and gets the "no longer works" answer.
      queryClient.removeQueries({ queryKey: queryKeys.invitation(token) });
    },
  });
}
