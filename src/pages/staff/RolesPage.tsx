import { useState } from 'react';
import { Plus } from 'lucide-react';

import { type Role } from '@/types/staff';
import { useRolesQuery } from '@/hooks/api/queries/staff/useRolesQuery';
import { useStaffQuery } from '@/hooks/api/queries/staff/useStaffQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { NewRoleDialog } from '@/components/staff/NewRoleDialog';
import { RolesTable } from '@/components/staff/RolesTable';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';

const PAGE_SUB =
  'Create roles, give them permissions, then assign people to them on the Staff page.';

function RolesContent({ roles }: { roles: Role[] }) {
  const { hasPermission } = useAuthedSession();
  const staffQuery = useStaffQuery();
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div>
      <PageHeader
        title="Roles"
        sub={PAGE_SUB}
        actions={
          hasPermission('staff.manage') ? (
            <Button onClick={() => setIsCreating(true)}>
              <Icon icon={Plus} />
              New role
            </Button>
          ) : null
        }
      />
      <Card flush title="All roles" subtitle={`${roles.length} roles`}>
        <RolesTable roles={roles} members={staffQuery.data ?? []} />
      </Card>
      {isCreating ? <NewRoleDialog onClose={() => setIsCreating(false)} /> : null}
    </div>
  );
}

export function RolesPage() {
  const rolesQuery = useRolesQuery();

  if (rolesQuery.isError) {
    return (
      <>
        <PageHeader title="Roles" sub={PAGE_SUB} />
        <div className="flex flex-col items-start gap-3">
          <Alert tone="danger">Couldn&apos;t load roles. Try again.</Alert>
          <Button variant="secondary" onClick={() => rolesQuery.refetch()}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  if (rolesQuery.isPending) {
    return (
      <div className="flex justify-center p-10 text-text-tertiary">
        <Spinner label="Loading roles" />
      </div>
    );
  }

  return <RolesContent roles={rolesQuery.data} />;
}
