import { useParams } from 'react-router-dom';

import { useOfferQuery } from '@/hooks/api/queries/pricing/useOfferQuery';
import { OfferEditorForm } from '@/components/offers/OfferEditorForm';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { isStatus } from '@/utils/apiErrors';

export function OfferDetailPage() {
  const { offerId = '' } = useParams();
  const offerQuery = useOfferQuery(Number(offerId));

  if (offerQuery.isError) {
    if (isStatus(offerQuery.error, 404)) return <NotFoundPage />;
    if (isStatus(offerQuery.error, 403)) {
      return (
        <>
          <PageHeader title="Offers" />
          <NoAccess message="You don't have access to offers." />
        </>
      );
    }
    return (
      <>
        <PageHeader title="Offers" />
        <div className="flex flex-col items-start gap-3">
          <Alert tone="danger">Couldn&apos;t load this offer. Try again.</Alert>
          <Button variant="secondary" onClick={() => offerQuery.refetch()}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  if (offerQuery.isPending) {
    return (
      <div className="flex justify-center p-10 text-text-tertiary">
        <Spinner label="Loading offer" />
      </div>
    );
  }

  return <OfferEditorForm offer={offerQuery.data} />;
}
