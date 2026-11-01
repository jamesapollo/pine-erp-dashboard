import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type Product } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

// `price` requires pricing.manage: leave the key out entirely when the user can't set prices.
export type CreateProductBody = {
  title: string;
  description?: string | null;
  category_ids: number[];
  price?: string | null;
  is_featured: boolean;
  option_type_ids: number[];
};

export async function createProduct(storeId: number, body: CreateProductBody): Promise<Product> {
  const { data } = await axiosInstance.post<{ data: Product }>(
    storePath(storeId, '/products'),
    body,
  );
  return data.data;
}

// Errors are left to the caller: a create 422 is mapped onto the form's fields.
export function useCreateProductMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProductBody) => createProduct(store.id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) });
    },
  });
}
