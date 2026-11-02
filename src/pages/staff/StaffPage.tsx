import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, UserPlus } from 'lucide-react';

import { type StaffMember } from '@/types/staff';
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

function getPageSub(storeName: string): string {
  return `People who can sign in to ${storeName}. Each person has one role.`;
}

function StaffContent({ members }: { members: StaffMember[] }) {
  const { hasPermission, store } = useAuthedSession();
  const canManage = hasPermission('staff.manage');
  const [isInviting, setIsInviting] = useState(false);

  return (
    <div>
      <PageHeader
        title="Staff"
        sub={getPageSub(store.name)}
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
              <Button onClick={() => setIsInviting(true)}>
                <Icon icon={UserPlus} />
                Invite staff
              </Button>
            </>
          ) : null
        }
      />
      <Card
        flush
        title="Members"
        subtitle={`${members.length} ${members.length === 1 ? 'person' : 'people'}`}
      >
        <StaffTable members={members} />
      </Card>
      {isInviting ? <InviteStaffDialog onClose={() => setIsInviting(false)} /> : null}
    </div>
  );
}

export function StaffPage() {
  const { store } = useAuthedSession();
  const staffQuery = useStaffQuery();

  if (staffQuery.isError) {
    return (
      <>
        <PageHeader title="Staff" sub={getPageSub(store.name)} />
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
