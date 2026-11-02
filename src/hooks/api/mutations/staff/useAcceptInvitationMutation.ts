import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/api/queryKeys';
import { axiosInstance, ensureCsrfCookie } from '@/utils/axiosConfig';

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
  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: async (_data, { token }) => {
      // The link is used up. Mark it dead in the cache so it never refetches into a 404 on screen.
      queryClient.setQueryData(queryKeys.invitation(token), null);
      // A new person is now signed in, and a returning one has a new store: reload the session.
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}
