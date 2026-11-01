import { useQueries } from '@tanstack/react-query';

import { type StockStatusFilter } from '@/hooks/api/queryKeys';
import { stockLevelsQueryOptions } from '@/hooks/api/queries/inventory/useStockLevelsQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';

const COUNTED_STATUSES: (StockStatusFilter | undefined)[] = [undefined, 'low', 'out'];

/** Tab counts and the store-wide totals, ignoring search and category like the design's stat cards. */
export function useStockSummaryQuery() {
  const { store } = useAuthedSession();
  const [all, low, out] = useQueries({
    queries: COUNTED_STATUSES.map((status) => ({
      ...stockLevelsQueryOptions(store.id, { status, perPage: 1 }),
      refetchOnMount: 'always' as const,
      refetchOnWindowFocus: 'always' as const,
    })),
  });

  return {
    counts: {
      all: all.data?.meta.total,
      low: low.data?.meta.total,
      out: out.data?.meta.total,
    },
    totals: all.data?.totals,
  };
}
