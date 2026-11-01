import { infiniteQueryOptions, useInfiniteQuery } from '@tanstack/react-query';

import { type Paginated, type StockMovement, type StockMovementType } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { STOCK_MOVEMENTS_PER_PAGE } from '@/hooks/api/queries/inventory/useStockMovementsQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

/** One page of a variant's stock movements, newest first, optionally of one type. */
export async function getVariantStockMovements(
  storeId: number,
  variantId: number,
  type: StockMovementType | undefined,
  page: number,
): Promise<Paginated<StockMovement>> {
  const { data } = await axiosInstance.get<Paginated<StockMovement>>(
    storePath(storeId, '/stock-movements'),
    { params: { variant_id: variantId, type, per_page: STOCK_MOVEMENTS_PER_PAGE, page } },
  );
  return data;
}

export function variantStockMovementsQueryOptions(
  storeId: number,
  variantId: number,
  type: StockMovementType | undefined,
) {
  return infiniteQueryOptions({
    queryKey: queryKeys.variantStockMovements(storeId, variantId, type),
    queryFn: ({ pageParam }) => getVariantStockMovements(storeId, variantId, type, pageParam),
    initialPageParam: 1,
    getNextPageParam: ({ meta }) =>
      meta.current_page < meta.last_page ? meta.current_page + 1 : undefined,
  });
}

export function useVariantStockMovementsQuery(variantId: number, type?: StockMovementType) {
  const { store } = useAuthedSession();
  return useInfiniteQuery({
    ...variantStockMovementsQueryOptions(store.id, variantId, type),
    refetchOnMount: 'always',
  });
}
