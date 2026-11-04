import { useEffect } from 'react';
import { Search } from 'lucide-react';

import { type EnquiryStatus } from '@/types/enquiry';
import {
  ENQUIRIES_PER_PAGE,
  useEnquiriesQuery,
} from '@/hooks/api/queries/enquiries/useEnquiriesQuery';
import { useEnquiryListFilters } from '@/hooks/useEnquiryListFilters';
import { EnquiriesTable } from '@/components/messages/EnquiriesTable';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { isStatus } from '@/utils/apiErrors';

export function MessagesPage() {
  const { filters, searchText, setStatus, setSearch, setPage } = useEnquiryListFilters();
  const enquiriesQuery = useEnquiriesQuery(filters);

  const hasFilters = Boolean(filters.status || filters.search);
  const page = filters.page ?? 1;

  const enquiriesData = enquiriesQuery.data;
  // A stale or hand-edited page number past the end: move to the last page instead of
  // claiming there are no messages.
  const lastPage = enquiriesData?.meta.last_page ?? 1;
  const isPastLastPage =
    enquiriesData !== undefined &&
    enquiriesData.data.length === 0 &&
    enquiriesData.meta.total > 0 &&
    page > lastPage;

  useEffect(() => {
    if (isPastLastPage) setPage(lastPage, true);
  }, [isPastLastPage, lastPage, setPage]);

  let table;
  if (enquiriesQuery.isPending || isPastLastPage) {
    table = <Spinner label="Loading messages" />;
  } else if (enquiriesQuery.isError) {
    table = (
      <div className="flex flex-col items-start gap-3 p-5">
        <Alert tone="danger">Couldn't load messages. Try again.</Alert>
        <Button variant="secondary" onClick={() => enquiriesQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else {
    table = (
      <>
        <EnquiriesTable enquiries={enquiriesQuery.data.data} hasFilters={hasFilters} />
        <Pagination
          page={page}
          perPage={ENQUIRIES_PER_PAGE}
          total={enquiriesQuery.data.meta.total}
          onPageChange={setPage}
          shouldPrefixShowing
        />
      </>
    );
  }

  const content =
    enquiriesQuery.isError && isStatus(enquiriesQuery.error, 403) ? (
      <NoAccess message="You don't have access to messages." />
    ) : (
      <Card flush>
        <div className="px-5">
          <Tabs
            label="Message status"
            value={filters.status ?? 'all'}
            onChange={(value) => setStatus(value === 'all' ? undefined : (value as EnquiryStatus))}
            items={[
              { value: 'new', label: 'New' },
              { value: 'replied', label: 'Replied' },
              { value: 'closed', label: 'Closed' },
              { value: 'all', label: 'All' },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-5 py-3">
          <Input
            label="Search messages"
            hideLabel
            icon={Search}
            size="sm"
            placeholder="Name, email or message"
            className="w-[260px]"
            value={searchText}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {table}
      </Card>
    );

  return (
    <div>
      <PageHeader title="Messages" sub="Messages sent from the contact form on your website." />
      {content}
    </div>
  );
}
