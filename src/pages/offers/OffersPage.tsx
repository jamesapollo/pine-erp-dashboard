import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';

import { OFFERS_PER_PAGE, useOffersQuery } from '@/hooks/api/queries/pricing/useOffersQuery';
import { useOfferStatusCountsQuery } from '@/hooks/api/queries/pricing/useOfferStatusCountsQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useOfferListFilters, type OfferTab } from '@/hooks/useOfferListFilters';
import { OffersTable } from '@/components/offers/OffersTable';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { isStatus } from '@/utils/apiErrors';
import { ROUTES } from '@/constants/routes';

export function OffersPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuthedSession();
  const { filters, tab, searchText, setTab, setSearch, setPage } = useOfferListFilters();
  const offersQuery = useOffersQuery(filters);
  const { counts } = useOfferStatusCountsQuery({ search: filters.search });

  const hasFilters = tab !== 'all' || Boolean(filters.search);
  const page = filters.page ?? 1;

  const offersData = offersQuery.data;
  // A stale or hand-edited page number past the end: move to the last page instead of
  // claiming there are no offers.
  const lastPage = offersData?.meta.last_page ?? 1;
  const isPastLastPage =
    offersData !== undefined &&
    offersData.data.length === 0 &&
    offersData.meta.total > 0 &&
    page > lastPage;

  useEffect(() => {
    if (isPastLastPage) setPage(lastPage, true);
  }, [isPastLastPage, lastPage, setPage]);

  let table;
  if (offersQuery.isPending || isPastLastPage) {
    table = <Spinner label="Loading offers" />;
  } else if (offersQuery.isError) {
    table = (
      <div className="flex flex-col items-start gap-3 p-5">
        <Alert tone="danger">Couldn&apos;t load offers. Try again.</Alert>
        <Button variant="secondary" onClick={() => offersQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else {
    table = (
      <>
        <OffersTable offers={offersQuery.data.data} hasFilters={hasFilters} />
        <Pagination
          page={page}
          perPage={OFFERS_PER_PAGE}
          total={offersQuery.data.meta.total}
          onPageChange={setPage}
          shouldPrefixShowing
        />
      </>
    );
  }

  const content =
    offersQuery.isError && isStatus(offersQuery.error, 403) ? (
      <NoAccess message="You don't have access to offers." />
    ) : (
      <Card flush>
        <div className="px-5">
          <Tabs
            label="Offer status"
            value={tab}
            onChange={(value) => setTab(value as OfferTab)}
            items={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'live', label: 'Live', count: counts.live },
              { value: 'scheduled', label: 'Scheduled', count: counts.scheduled },
              { value: 'inactive', label: 'Inactive' },
              { value: 'ended', label: 'Ended' },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-5 py-3">
          <Input
            label="Search offers"
            hideLabel
            icon={Search}
            size="sm"
            placeholder="Offer name"
            className="w-[260px]"
            maxLength={100}
            value={searchText}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {table}
      </Card>
    );

  return (
    <div>
      <PageHeader
        title="Offers"
        sub="Offers never stack: buyers always get the lowest price, and never below the store's minimum price."
        actions={
          hasPermission('pricing.manage') ? (
            <Button onClick={() => navigate(ROUTES.OFFER_NEW)}>
              <Icon icon={Plus} />
              Create offer
            </Button>
          ) : null
        }
      />
      {content}
    </div>
  );
}
