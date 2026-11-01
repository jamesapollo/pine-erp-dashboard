import { useEffect } from 'react';
import { Search } from 'lucide-react';

import { type OrderStatus } from '@/types/sales';
import { ORDERS_PER_PAGE, useOrdersQuery } from '@/hooks/api/queries/sales/useOrdersQuery';
import { useOrderStatusCountsQuery } from '@/hooks/api/queries/sales/useOrderStatusCountsQuery';
import { useOrderListFilters } from '@/hooks/useOrderListFilters';
import { OrdersTable } from '@/components/sales/OrdersTable';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { isStatus } from '@/utils/apiErrors';

export function OrdersPage() {
  const { filters, searchText, setStatus, setSearch, setFeePending, setPage } =
    useOrderListFilters();
  const ordersQuery = useOrdersQuery(filters);
  const { counts } = useOrderStatusCountsQuery({
    search: filters.search,
    feePending: filters.feePending,
  });

  const hasFilters = Boolean(filters.status || filters.search || filters.feePending);
  const page = filters.page ?? 1;

  const ordersData = ordersQuery.data;
  // A stale or hand-edited page number past the end: move to the last page instead of
  // claiming there are no orders.
  const lastPage = ordersData?.meta.last_page ?? 1;
  const isPastLastPage =
    ordersData !== undefined &&
    ordersData.data.length === 0 &&
    ordersData.meta.total > 0 &&
    page > lastPage;

  useEffect(() => {
    if (isPastLastPage) setPage(lastPage, true);
  }, [isPastLastPage, lastPage, setPage]);

  let table;
  if (ordersQuery.isPending || isPastLastPage) {
    table = <Spinner label="Loading orders" />;
  } else if (ordersQuery.isError) {
    table = (
      <div className="flex flex-col items-start gap-3 p-5">
        <Alert tone="danger">Couldn't load orders. Try again.</Alert>
        <Button variant="secondary" onClick={() => ordersQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else {
    table = (
      <>
        <OrdersTable orders={ordersQuery.data.data} hasFilters={hasFilters} />
        <Pagination
          page={page}
          perPage={ORDERS_PER_PAGE}
          total={ordersQuery.data.meta.total}
          onPageChange={setPage}
          shouldPrefixShowing
        />
      </>
    );
  }

  const content =
    ordersQuery.isError && isStatus(ordersQuery.error, 403) ? (
      <NoAccess message="You don't have access to orders." />
    ) : (
      <Card flush>
        <div className="px-5">
          <Tabs
            label="Order status"
            value={filters.status ?? 'all'}
            onChange={(value) => setStatus(value === 'all' ? undefined : (value as OrderStatus))}
            items={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'pending', label: 'Pending', count: counts.pending },
              { value: 'confirmed', label: 'Confirmed', count: counts.confirmed },
              { value: 'dispatched', label: 'Dispatched', count: counts.dispatched },
              { value: 'completed', label: 'Completed', count: counts.completed },
              { value: 'cancelled', label: 'Cancelled', count: counts.cancelled },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-5 py-3">
          <Input
            label="Search orders"
            hideLabel
            icon={Search}
            size="sm"
            placeholder="Reference or phone"
            className="w-[260px]"
            value={searchText}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Chip
            isSelected={Boolean(filters.feePending)}
            onClick={() => setFeePending(!filters.feePending)}
          >
            Fee pending
          </Chip>
        </div>
        {table}
      </Card>
    );

  return (
    <div>
      <PageHeader
        title="Orders"
        sub="Storefront orders. Payment and delivery are arranged with the buyer."
      />
      {content}
    </div>
  );
}
