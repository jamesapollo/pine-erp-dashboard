import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type Category } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

// The API answers with the whole category tree (the same shape as GET categories), so it goes
// straight into the cache. Errors are shown by the nav panel next to its form.
export function useSetCategoryNavMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async (categoryIds: number[]) => {
      const { data } = await axiosInstance.put<{ data: Category[] }>(
        storePath(store.id, '/category-nav'),
        { category_ids: categoryIds },
      );
      return data.data;
    },
    onSuccess: (tree) => {
      queryClient.setQueryData(queryKeys.categories(store.id), tree);
      showToast({ title: 'Category nav saved' });
    },
  });
}
