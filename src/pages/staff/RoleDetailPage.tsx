import { useParams } from 'react-router-dom';

import { useRoleQuery } from '@/hooks/api/queries/staff/useRoleQuery';
import { RoleEditorForm } from '@/components/staff/RoleEditorForm';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { isStatus } from '@/utils/apiErrors';

export function RoleDetailPage() {
  const { roleId = '' } = useParams();
  const roleQuery = useRoleQuery(Number(roleId));

  if (roleQuery.isError) {
    if (isStatus(roleQuery.error, 404)) return <NotFoundPage />;
    if (isStatus(roleQuery.error, 403)) {
      return (
        <>
          <PageHeader title="Roles" />
          <NoAccess message="You don't have access to staff." />
        </>
      );
    }
    return (
      <>
        <PageHeader title="Roles" />
        <div className="flex flex-col items-start gap-3">
          <Alert tone="danger">Couldn&apos;t load this role. Try again.</Alert>
          <Button variant="secondary" onClick={() => roleQuery.refetch()}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  if (roleQuery.isPending) {
    return (
      <div className="flex justify-center p-10 text-text-tertiary">
        <Spinner label="Loading role" />
      </div>
    );
  }

  return <RoleEditorForm role={roleQuery.data} />;
}
