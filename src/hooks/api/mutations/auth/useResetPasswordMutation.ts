import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/api/queryKeys';
import { axiosInstance, ensureCsrfCookie } from '@/utils/axiosConfig';

export type ResetPasswordMutationParams = {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
};

async function resetPassword(params: ResetPasswordMutationParams): Promise<void> {
  await ensureCsrfCookie();
  await axiosInstance.post('/reset-password', params);
}

export function useResetPasswordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      // A reset ends every session, so a user who was signed in is signed out here too.
      queryClient.clear();
      queryClient.setQueryData(queryKeys.me, null);
    },
  });
}
