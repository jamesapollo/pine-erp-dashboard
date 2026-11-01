import { queryOptions, useQuery } from '@tanstack/react-query';

import { type Category } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function getCategories(storeId: number): Promise<Category[]> {
  const { data } = await axiosInstance.get<{ data: Category[] }>(storePath(storeId, '/categories'));
  return data.data;
}

export function categoriesQueryOptions(storeId: number) {
  return queryOptions({
    queryKey: queryKeys.categories(storeId),
    queryFn: () => getCategories(storeId),
  });
}

export function useCategoriesQuery({ isEnabled = true }: { isEnabled?: boolean } = {}) {
  const { store } = useAuthedSession();
  return useQuery({ ...categoriesQueryOptions(store.id), enabled: isEnabled });
}
