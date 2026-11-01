import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type OptionType } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export type CreateOptionTypeMutationParams = { name: string };

export function useCreateOptionTypeMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async (params: CreateOptionTypeMutationParams) => {
      const { data } = await axiosInstance.post<{ data: OptionType }>(
        storePath(store.id, '/option-types'),
        params,
      );
      return data.data;
    },
    onSuccess: async (optionType) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.optionTypes(store.id) });
      showToast({ title: 'Option type added', description: optionType.name });
    },
    onError: (error) => {
      showToast({ title: getActionErrorMessage(error), tone: 'danger' });
    },
  });
}
