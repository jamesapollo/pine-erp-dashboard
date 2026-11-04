import { useEffect } from 'react';
import { Boxes, CircleAlert, Search, Timer } from 'lucide-react';

import { type StockStatusFilter } from '@/hooks/api/queryKeys';
import { useCategoriesQuery } from '@/hooks/api/queries/catalogue/useCategoriesQuery';
import {
  STOCK_LEVELS_PER_PAGE,
  useStockLevelsQuery,
} from '@/hooks/api/queries/inventory/useStockLevelsQuery';
import { useStockSummaryQuery } from '@/hooks/api/queries/inventory/useStockSummaryQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useStockListFilters } from '@/hooks/useStockListFilters';
import { StockLevelsTable } from '@/components/inventory/StockLevelsTable';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import { isStatus } from '@/utils/apiErrors';
import { flattenStandardCategories, indentCategoryLabel } from '@/utils/categoryTree';

function formatCount(value: number | undefined): string {
  return value === undefined ? '—' : value.toLocaleString('en-KE');
}

// Categories need catalogue.view; without it the filter is left out rather than failing.
function CategoryFilter({
  value,
  onChange,
}: {
  value?: number;
  onChange: (categoryId?: number) => void;
}) {
  const categoriesQuery = useCategoriesQuery();
  const options = flattenStandardCategories(categoriesQuery.data ?? []).map(
    ({ category, depth }) => ({
      value: String(category.id),
      label: indentCategoryLabel(category.name, depth),
    }),
  );

  return (
    <Select
      label="Category"
      hideLabel
      size="sm"
      placeholder="All categories"
      className="w-[190px]"
      options={options}
      value={value ? String(value) : ''}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)}
    />
  );
}

export function StockPage() {
  const { hasPermission } = useAuthedSession();
  const { filters, searchText, setStatus, setSearch, setCategory, setPage } = useStockListFilters();
  const levelsQuery = useStockLevelsQuery(filters);
  const { counts, totals } = useStockSummaryQuery();

  const hasFilters = Boolean(filters.status || filters.search || filters.category);
  const page = filters.page ?? 1;

  // A stale or hand-edited page number past the end: move to the last page instead of
  // claiming there are no variants.
  const levelsData = levelsQuery.data;
  const lastPage = levelsData?.meta.last_page ?? 1;
  const isPastLastPage =
    levelsData !== undefined &&
    levelsData.data.length === 0 &&
    levelsData.meta.total > 0 &&
    page > lastPage;

  useEffect(() => {
    if (isPastLastPage) setPage(lastPage, true);
  }, [isPastLastPage, lastPage, setPage]);

  if (levelsQuery.isError && isStatus(levelsQuery.error, 403)) {
    return (
      <div>
        <PageHeader title="Stock" />
        <NoAccess message="You don't have access to stock." />
      </div>
    );
  }

  let table;
  if (levelsQuery.isPending || isPastLastPage) {
    table = (
      <div className="flex justify-center p-10 text-text-tertiary">
        <Spinner label="Loading stock" />
      </div>
    );
  } else if (levelsQuery.isError) {
    table = (
      <div className="flex flex-col items-start gap-3 p-5">
        <Alert tone="danger">Couldn&apos;t load stock. Try again.</Alert>
        <Button variant="secondary" onClick={() => levelsQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else {
    table = (
      <>
        <StockLevelsTable levels={levelsQuery.data.data} hasFilters={hasFilters} />
        <Pagination
          page={page}
          perPage={STOCK_LEVELS_PER_PAGE}
          total={levelsQuery.data.meta.total}
          onPageChange={setPage}
          shouldPrefixShowing
        />
      </>
    );
  }

  return (
    <div>
      <PageHeader
        title="Stock"
        sub="Available = on hand minus units held for pending orders. Open a variant to see its history or adjust it."
      />
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <StatCard
          label="Units on hand"
          value={formatCount(totals?.on_hand)}
          hint={counts.all === undefined ? undefined : `across ${formatCount(counts.all)} variants`}
          icon={Boxes}
        />
        <StatCard
          label="Held for orders"
          value={formatCount(totals?.reserved)}
          hint="in pending orders"
          icon={Timer}
        />
        <StatCard
          label="Out of stock"
          value={formatCount(counts.out)}
          hint="variants"
          icon={CircleAlert}
        />
      </div>
      <Card flush>
        <div className="px-5">
          <Tabs
            label="Stock status"
            value={filters.status ?? 'all'}
            onChange={(value) =>
              setStatus(value === 'all' ? undefined : (value as StockStatusFilter))
            }
            items={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'low', label: 'Low stock', count: counts.low },
              { value: 'out', label: 'Out of stock', count: counts.out },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-5 py-3">
          <Input
            label="Search stock"
            hideLabel
            icon={Search}
            size="sm"
            placeholder="Product, variant or SKU"
            className="w-[260px]"
            value={searchText}
            onChange={(event) => setSearch(event.target.value)}
          />
          {hasPermission('catalogue.view') ? (
            <CategoryFilter value={filters.category} onChange={setCategory} />
          ) : null}
        </div>
        {table}
      </Card>
    </div>
  );
}
