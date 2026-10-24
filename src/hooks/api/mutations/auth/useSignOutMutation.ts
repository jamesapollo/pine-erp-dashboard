import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { queryKeys } from '@/hooks/api/queryKeys';
import { axiosInstance, ensureCsrfCookie } from '@/utils/axiosConfig';

async function signOut(): Promise<void> {
  await ensureCsrfCookie();
  try {
    await axiosInstance.post('/logout');
  } catch (error) {
    // An already-expired session is the outcome the user asked for.
    if (axios.isAxiosError(error) && error.response?.status === 401) return;
    throw error;
  }
}

export function useSignOutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(queryKeys.me, null);
    },
  });
}
