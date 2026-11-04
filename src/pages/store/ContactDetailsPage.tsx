import { useContactDetailsQuery } from '@/hooks/api/queries/store/useContactDetailsQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { ContactDetailsForm } from '@/components/store/ContactDetailsForm';
import { Alert } from '@/components/ui/Alert';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { getActionErrorMessage } from '@/utils/apiErrors';

export function ContactDetailsPage() {
  const { hasPermission } = useAuthedSession();
  const detailsQuery = useContactDetailsQuery();

  return (
    <div>
      <PageHeader
        title="Contact details"
        sub="Shown on the website's contact page and footer, and used for enquiry replies."
      />
      {detailsQuery.isError ? (
        <Alert tone="danger">{getActionErrorMessage(detailsQuery.error)}</Alert>
      ) : detailsQuery.isPending ? (
        <Spinner label="Loading contact details" />
      ) : (
        <ContactDetailsForm details={detailsQuery.data} canManage={hasPermission('store.manage')} />
      )}
    </div>
  );
}
