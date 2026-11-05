import { useQueries } from '@tanstack/react-query';

import { type OfferStatus } from '@/types/pricing';
import { offersQueryOptions } from '@/hooks/api/queries/pricing/useOffersQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';

// The tabs that carry a count: inactive and ended ones are history, so they go uncounted.
const COUNTED_STATUSES: (OfferStatus | undefined)[] = [undefined, 'live', 'scheduled'];

export function useOfferStatusCountsQuery({ search }: { search?: string }) {
  const { store } = useAuthedSession();
  const results = useQueries({
    queries: COUNTED_STATUSES.map((status) => ({
      ...offersQueryOptions(store.id, { status, search, perPage: 1 }),
      refetchOnMount: 'always' as const,
    })),
  });

  const counts: Record<'all' | 'live' | 'scheduled', number | undefined> = {
    all: results[0].data?.meta.total,
    live: results[1].data?.meta.total,
    scheduled: results[2].data?.meta.total,
  };
  return { counts };
}
