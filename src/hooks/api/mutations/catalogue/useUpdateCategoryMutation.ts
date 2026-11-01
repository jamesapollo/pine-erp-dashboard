import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type Category } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export type UpdateCategoryMutationParams = {
  categoryId: number;
  name?: string;
  parent_id?: number | null;
  is_visible?: boolean;
};

export function useUpdateCategoryMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async ({ categoryId, ...fields }: UpdateCategoryMutationParams) => {
      const { data } = await axiosInstance.patch<{ data: Category }>(
        storePath(store.id, `/categories/${categoryId}`),
        fields,
      );
      return data.data;
    },
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories(store.id) });
      showToast({ title: 'Category saved', description: category.name });
    },
  });
}
