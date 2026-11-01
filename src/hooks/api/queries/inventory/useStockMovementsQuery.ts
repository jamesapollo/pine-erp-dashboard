import { infiniteQueryOptions, useInfiniteQuery } from '@tanstack/react-query';

import { type Paginated, type StockMovement } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export const STOCK_MOVEMENTS_PER_PAGE = 25;

/** One page of a product's stock movements, newest first. */
export async function getStockMovements(
  storeId: number,
  productId: number,
  page: number,
): Promise<Paginated<StockMovement>> {
  const { data } = await axiosInstance.get<Paginated<StockMovement>>(
    storePath(storeId, '/stock-movements'),
    { params: { product_id: productId, per_page: STOCK_MOVEMENTS_PER_PAGE, page } },
  );
  return data;
}

export function stockMovementsQueryOptions(storeId: number, productId: number) {
  return infiniteQueryOptions({
    queryKey: queryKeys.stockMovements(storeId, productId),
    queryFn: ({ pageParam }) => getStockMovements(storeId, productId, pageParam),
    initialPageParam: 1,
    getNextPageParam: ({ meta }) =>
      meta.current_page < meta.last_page ? meta.current_page + 1 : undefined,
  });
}

export function useStockMovementsQuery(productId: number, { isEnabled }: { isEnabled: boolean }) {
  const { store } = useAuthedSession();
  return useInfiniteQuery({
    ...stockMovementsQueryOptions(store.id, productId),
    enabled: isEnabled,
  });
}
