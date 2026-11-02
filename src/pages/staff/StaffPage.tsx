import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ShieldCheck } from 'lucide-react';

import { type StaffMember } from '@/types/staff';
import { useRolesQuery } from '@/hooks/api/queries/staff/useRolesQuery';
import { useStaffQuery } from '@/hooks/api/queries/staff/useStaffQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { InviteStaffDialog } from '@/components/staff/InviteStaffDialog';
import { StaffTable } from '@/components/staff/StaffTable';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { ROUTES } from '@/constants/routes';

const PAGE_SUB = 'Everyone who can sign in to this store, and what they can do.';

function StaffContent({ members }: { members: StaffMember[] }) {
  const { hasPermission } = useAuthedSession();
  const canManage = hasPermission('staff.manage');
  const rolesQuery = useRolesQuery();
  const [isInviting, setIsInviting] = useState(false);

  return (
    <div>
      <PageHeader
        title="Staff"
        sub={PAGE_SUB}
        actions={
          canManage ? (
            <>
              <Link
                to={ROUTES.ROLES}
                className="inline-flex h-[34px] items-center gap-2 rounded-control border border-border-default bg-surface-card px-3.5 text-sm font-medium text-text-primary no-underline hover:bg-surface-hover focus-visible:shadow-focus focus-visible:outline-none"
              >
                <Icon icon={ShieldCheck} />
                Manage roles
              </Link>
              <Button disabled={!rolesQuery.isSuccess} onClick={() => setIsInviting(true)}>
                <Icon icon={Plus} />
                Invite staff
              </Button>
            </>
          ) : null
        }
      />
      <Card flush>
        <StaffTable members={members} />
      </Card>
      {isInviting && rolesQuery.isSuccess ? (
        <InviteStaffDialog roles={rolesQuery.data} onClose={() => setIsInviting(false)} />
      ) : null}
    </div>
  );
}

export function StaffPage() {
  const staffQuery = useStaffQuery();

  if (staffQuery.isError) {
    return (
      <>
        <PageHeader title="Staff" sub={PAGE_SUB} />
        <div className="flex flex-col items-start gap-3">
          <Alert tone="danger">Couldn&apos;t load staff. Try again.</Alert>
          <Button variant="secondary" onClick={() => staffQuery.refetch()}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  if (staffQuery.isPending) {
    return (
      <div className="flex justify-center p-10 text-text-tertiary">
        <Spinner label="Loading staff" />
      </div>
    );
  }

  return <StaffContent members={staffQuery.data} />;
}
