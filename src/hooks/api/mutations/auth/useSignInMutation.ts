import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/api/queryKeys';
import { axiosInstance, ensureCsrfCookie } from '@/utils/axiosConfig';

export type SignInMutationParams = { email: string; password: string };

async function signIn({ email, password }: SignInMutationParams): Promise<void> {
  await ensureCsrfCookie();
  await axiosInstance.post('/login', { email, password });
}

export function useSignInMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signIn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}
