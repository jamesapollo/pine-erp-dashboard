import { useEffect } from 'react';
import { Search } from 'lucide-react';

import { type DeliveryStatus } from '@/types/sales';
import { useCouriersQuery } from '@/hooks/api/queries/sales/useCouriersQuery';
import {
  DELIVERIES_PER_PAGE,
  useDeliveriesQuery,
} from '@/hooks/api/queries/sales/useDeliveriesQuery';
import { useDeliveryListFilters } from '@/hooks/useDeliveryListFilters';
import { DeliveriesTable } from '@/components/sales/DeliveriesTable';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { isStatus } from '@/utils/apiErrors';

export function DeliveriesPage() {
  const { filters, searchText, setStatus, setSearch, setCourierId, clear, setPage } =
    useDeliveryListFilters();
  const deliveriesQuery = useDeliveriesQuery(filters);
  const couriersQuery = useCouriersQuery();

  const hasFilters = Boolean(filters.search || filters.courierId || searchText);
  const page = filters.page ?? 1;

  const deliveriesData = deliveriesQuery.data;
  // A stale or hand-edited page number past the end: move to the last page instead of
  // claiming there are no deliveries.
  const lastPage = deliveriesData?.meta.last_page ?? 1;
  const isPastLastPage =
    deliveriesData !== undefined &&
    deliveriesData.data.length === 0 &&
    deliveriesData.meta.total > 0 &&
    page > lastPage;

  useEffect(() => {
    if (isPastLastPage) setPage(lastPage, true);
  }, [isPastLastPage, lastPage, setPage]);

  let table;
  if (deliveriesQuery.isPending || isPastLastPage) {
    table = <Spinner label="Loading deliveries" />;
  } else if (deliveriesQuery.isError) {
    table = (
      <div className="flex flex-col items-start gap-3 p-5">
        <Alert tone="danger">Couldn't load deliveries. Try again.</Alert>
        <Button variant="secondary" onClick={() => deliveriesQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else {
    table = (
      <>
        <DeliveriesTable
          deliveries={deliveriesQuery.data.data}
          isSearching={Boolean(filters.search)}
        />
        <Pagination
          page={page}
          perPage={DELIVERIES_PER_PAGE}
          total={deliveriesQuery.data.meta.total}
          onPageChange={setPage}
          shouldPrefixShowing
        />
      </>
    );
  }

  const content =
    deliveriesQuery.isError && isStatus(deliveriesQuery.error, 403) ? (
      <NoAccess message="You don't have access to orders." />
    ) : (
      <Card flush>
        <div className="px-5">
          <Tabs
            label="Delivery status"
            value={filters.status ?? 'all'}
            onChange={(value) => setStatus(value === 'all' ? undefined : (value as DeliveryStatus))}
            items={[
              { value: 'all', label: 'All' },
              { value: 'preparing', label: 'Preparing' },
              { value: 'dispatched', label: 'Dispatched' },
              { value: 'in_transit', label: 'In transit' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'failed', label: 'Failed' },
              { value: 'returned', label: 'Returned' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-5 py-3">
          <Input
            label="Search deliveries"
            hideLabel
            icon={Search}
            size="sm"
            placeholder="Order reference or tracking number"
            className="w-[280px]"
            value={searchText}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            label="Courier"
            hideLabel
            size="sm"
            placeholder="All couriers"
            className="w-[180px]"
            value={filters.courierId ? String(filters.courierId) : ''}
            onChange={(event) =>
              setCourierId(event.target.value ? Number(event.target.value) : undefined)
            }
            options={(couriersQuery.data ?? []).map((courier) => ({
              value: String(courier.id),
              label: courier.name,
            }))}
          />
          {hasFilters ? (
            <Button size="sm" variant="ghost" onClick={clear}>
              Clear
            </Button>
          ) : null}
        </div>
        {table}
      </Card>
    );

  return (
    <div>
      <PageHeader
        title="Deliveries"
        sub="One per dispatched order. Deliveries are created from the order page and never deleted."
      />
      {content}
    </div>
  );
}
