import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';

import { type Paginated, type ProductListItem } from '@/types/catalogue';
import { queryKeys, type ProductListFilters } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export const PRODUCTS_PER_PAGE = 25;

export async function getProducts(
  storeId: number,
  filters: ProductListFilters,
): Promise<Paginated<ProductListItem>> {
  const { data } = await axiosInstance.get<Paginated<ProductListItem>>(
    storePath(storeId, '/products'),
    {
      params: {
        status: filters.status,
        search: filters.search || undefined,
        category: filters.category,
        page: filters.page,
        per_page: filters.perPage ?? PRODUCTS_PER_PAGE,
      },
    },
  );
  return data;
}

export function productsQueryOptions(storeId: number, filters: ProductListFilters) {
  return queryOptions({
    queryKey: queryKeys.productList(storeId, filters),
    queryFn: () => getProducts(storeId, filters),
  });
}

export function useProductsQuery(filters: ProductListFilters) {
  const { store } = useAuthedSession();
  return useQuery({
    ...productsQueryOptions(store.id, filters),
    placeholderData: keepPreviousData,
  });
}
