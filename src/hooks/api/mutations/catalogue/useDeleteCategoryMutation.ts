import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export type DeleteCategoryMutationParams = { categoryId: number; name: string };

export function useDeleteCategoryMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async ({ categoryId }: DeleteCategoryMutationParams) => {
      await axiosInstance.delete(storePath(store.id, `/categories/${categoryId}`));
    },
    onSuccess: async (_result, { name }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories(store.id) });
      showToast({ title: 'Category deleted', description: name });
    },
    // Shown here rather than in the screen, so a failure that lands after the editor or dialog
    // has gone still reaches the user.
    onError: (error) => {
      showToast({ title: getActionErrorMessage(error), tone: 'danger' });
    },
  });
}
