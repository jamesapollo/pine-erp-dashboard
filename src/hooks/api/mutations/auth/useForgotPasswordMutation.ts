import { useMutation } from '@tanstack/react-query';

import { axiosInstance, ensureCsrfCookie } from '@/utils/axiosConfig';

export type ForgotPasswordMutationParams = { email: string };

async function forgotPassword({ email }: ForgotPasswordMutationParams): Promise<void> {
  await ensureCsrfCookie();
  await axiosInstance.post('/forgot-password', { email });
}

export function useForgotPasswordMutation() {
  return useMutation({ mutationFn: forgotPassword });
}
