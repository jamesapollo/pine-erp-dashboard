import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type OptionValue } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export type CreateOptionValueMutationParams = {
  optionTypeId: number;
  value: string;
  sort_order: number;
};

export function useCreateOptionValueMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async ({ optionTypeId, ...fields }: CreateOptionValueMutationParams) => {
      const { data } = await axiosInstance.post<{ data: OptionValue }>(
        storePath(store.id, `/option-types/${optionTypeId}/values`),
        fields,
      );
      return data.data;
    },
    onSuccess: async (_optionValue, { value }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.optionTypes(store.id) });
      showToast({ title: 'Value added', description: value });
    },
    onError: (error) => {
      showToast({ title: getActionErrorMessage(error), tone: 'danger' });
    },
  });
}
