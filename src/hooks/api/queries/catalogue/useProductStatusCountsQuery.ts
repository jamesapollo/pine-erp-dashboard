import { useQueries } from '@tanstack/react-query';

import { type ProductStatus } from '@/types/catalogue';
import { productsQueryOptions } from '@/hooks/api/queries/catalogue/useProductsQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';

const COUNTED_STATUSES: (ProductStatus | undefined)[] = [
  undefined,
  'published',
  'draft',
  'archived',
];

export function useProductStatusCountsQuery({
  search,
  category,
}: {
  search?: string;
  category?: number;
}) {
  const { store } = useAuthedSession();
  const results = useQueries({
    queries: COUNTED_STATUSES.map((status) =>
      productsQueryOptions(store.id, { status, search, category, perPage: 1 }),
    ),
  });

  const counts: Record<'all' | ProductStatus, number | undefined> = {
    all: results[0].data?.meta.total,
    published: results[1].data?.meta.total,
    draft: results[2].data?.meta.total,
    archived: results[3].data?.meta.total,
  };
  return { counts };
}
