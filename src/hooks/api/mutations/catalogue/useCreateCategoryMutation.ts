import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type Category } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export type CreateCategoryMutationParams = { name: string; parent_id: number | null };

export function useCreateCategoryMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async (params: CreateCategoryMutationParams) => {
      const { data } = await axiosInstance.post<{ data: Category }>(
        storePath(store.id, '/categories'),
        params,
      );
      return data.data;
    },
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories(store.id) });
      showToast({ title: 'Category added', description: category.name });
    },
    // Shown here rather than in the screen, so a failure that lands after the editor or dialog
    // has gone still reaches the user.
    onError: (error) => {
      showToast({ title: getActionErrorMessage(error), tone: 'danger' });
    },
  });
}
