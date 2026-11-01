import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export type DeleteOptionTypeMutationParams = { optionTypeId: number; name: string };

export function useDeleteOptionTypeMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async ({ optionTypeId }: DeleteOptionTypeMutationParams) => {
      await axiosInstance.delete(storePath(store.id, `/option-types/${optionTypeId}`));
    },
    onSuccess: async (_result, { name }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.optionTypes(store.id) });
      showToast({ title: 'Option type deleted', description: name });
    },
    onError: (error) => {
      showToast({ title: getActionErrorMessage(error), tone: 'danger' });
    },
  });
}
