import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export type DeleteOptionValueMutationParams = {
  optionTypeId: number;
  optionValueId: number;
  name: string;
};

export function useDeleteOptionValueMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async ({ optionTypeId, optionValueId }: DeleteOptionValueMutationParams) => {
      await axiosInstance.delete(
        storePath(store.id, `/option-types/${optionTypeId}/values/${optionValueId}`),
      );
    },
    onSuccess: async (_result, { name }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.optionTypes(store.id) });
      showToast({ title: 'Value deleted', description: name });
    },
    onError: (error) => {
      showToast({ title: getActionErrorMessage(error), tone: 'danger' });
    },
  });
}
