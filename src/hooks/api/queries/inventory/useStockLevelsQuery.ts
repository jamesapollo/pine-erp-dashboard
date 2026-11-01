import { queryOptions, useQuery } from '@tanstack/react-query';

import { type Paginated, type StockTotals, type VariantStockLevel } from '@/types/catalogue';
import { queryKeys, type StockListFilters } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { getAvailableRange } from '@/utils/stockStatus';
import { storePath } from '@/utils/storePath';

export const STOCK_LEVELS_PER_PAGE = 25;

export type StockLevelList = Paginated<VariantStockLevel> & { totals: StockTotals };

/** A page of the store's sellable variants with their stock, and on-hand totals over every match. */
export async function getStockLevels(
  storeId: number,
  filters: StockListFilters,
): Promise<StockLevelList> {
  const { data } = await axiosInstance.get<StockLevelList>(storePath(storeId, '/stock-levels'), {
    params: {
      ...(filters.status ? getAvailableRange(filters.status) : {}),
      search: filters.search,
      category: filters.category,
      page: filters.page,
      per_page: filters.perPage ?? STOCK_LEVELS_PER_PAGE,
    },
  });
  return data;
}

export function stockLevelsQueryOptions(storeId: number, filters: StockListFilters) {
  return queryOptions({
    queryKey: queryKeys.stockLevelList(storeId, filters),
    queryFn: () => getStockLevels(storeId, filters),
  });
}

// Stock moves with every storefront order, so the list loads again on each visit and on focus.
export function useStockLevelsQuery(filters: StockListFilters) {
  const { store } = useAuthedSession();
  return useQuery({
    ...stockLevelsQueryOptions(store.id, filters),
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
}
