import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Mail, Send } from 'lucide-react';

import { type Role, type StaffMember } from '@/types/staff';
import { useRolesQuery } from '@/hooks/api/queries/staff/useRolesQuery';
import { useStaffMemberQuery } from '@/hooks/api/queries/staff/useStaffMemberQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { RemoveStaffCard } from '@/components/staff/RemoveStaffCard';
import { RolePermissionsList } from '@/components/staff/RolePermissionsList';
import { StaffActionDialog, type StaffAction } from '@/components/staff/StaffActionDialog';
import { StaffHeaderActions } from '@/components/staff/StaffHeaderActions';
import { StaffProfileCard } from '@/components/staff/StaffProfileCard';
import { StaffRoleCard } from '@/components/staff/StaffRoleCard';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { isStatus } from '@/utils/apiErrors';
import { formatDateTime } from '@/utils/movementTime';
import { ROUTES } from '@/constants/routes';

function InvitationPendingCard({
  member,
  onResend,
}: {
  member: StaffMember;
  onResend: (() => void) | null;
}) {
  const { invitation } = member;
  const sent = invitation ? `Sent ${formatDateTime(invitation.sent_at)}` : 'Sent';
  const sender = invitation?.invited_by_name ? ` by ${invitation.invited_by_name}` : '';

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <Icon icon={Mail} size={18} className="text-text-secondary" />
        <div className="min-w-[200px] flex-1">
          <div className="font-medium text-text-primary">Invitation pending</div>
          <div className="text-[13px] text-text-secondary">
            {sent}
            {sender}. Links expire after 7 days.
          </div>
        </div>
        {onResend ? (
          <Button variant="secondary" size="sm" onClick={onResend}>
            <Icon icon={Send} />
            Resend
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function RoleSections({ member, roles }: { member: StaffMember; roles: Role[] }) {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(member.role?.id ?? null);
  const savedRoleId = member.role?.id ?? null;
  const shownRole = roles.find(
    (role) => role.id === (member.is_owner ? savedRoleId : selectedRoleId),
  );

  return (
    <>
      <StaffRoleCard
        member={member}
        roles={roles}
        selectedRoleId={selectedRoleId}
        onSelectRole={setSelectedRoleId}
      />
      {shownRole ? (
        <div className="col-span-full">
          <RolePermissionsList role={shownRole} isPreview={selectedRoleId !== savedRoleId} />
        </div>
      ) : null}
    </>
  );
}

function StaffMemberContent({ member }: { member: StaffMember }) {
  const { hasPermission } = useAuthedSession();
  const canManage = hasPermission('staff.manage');
  const rolesQuery = useRolesQuery();
  const [action, setAction] = useState<StaffAction | null>(null);
  const canAct = canManage && !member.is_owner;

  return (
    <div>
      <PageHeader
        back={<BackLink to={ROUTES.STAFF}>Staff</BackLink>}
        title={
          <span className="inline-flex items-center gap-3.5">
            <Avatar name={member.name} size={44} />
            {member.name}
          </span>
        }
        titleAside={<StatusBadge kind="membership" status={member.status} />}
        sub={member.email}
        actions={canAct ? <StaffHeaderActions member={member} onAction={setAction} /> : null}
      />
      <div className="grid gap-4">
        {member.status === 'invited' ? (
          <InvitationPendingCard
            member={member}
            onResend={canAct ? () => setAction('resend') : null}
          />
        ) : null}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-4">
          <StaffProfileCard member={member} />
          {rolesQuery.isSuccess ? (
            <RoleSections key={member.role?.id ?? 'none'} member={member} roles={rolesQuery.data} />
          ) : (
            <Card title="Role" subtitle="Decides what they can see and do">
              {rolesQuery.isError ? (
                <div className="flex flex-col items-start gap-3">
                  <Alert tone="danger">Couldn&apos;t load roles. Try again.</Alert>
                  <Button variant="secondary" onClick={() => rolesQuery.refetch()}>
                    Try again
                  </Button>
                </div>
              ) : (
                <div className="flex justify-center p-4 text-text-tertiary">
                  <Spinner label="Loading roles" />
                </div>
              )}
            </Card>
          )}
        </div>
        {canAct ? <RemoveStaffCard member={member} /> : null}
      </div>
      {action ? (
        <StaffActionDialog action={action} member={member} onClose={() => setAction(null)} />
      ) : null}
    </div>
  );
}

export function StaffMemberPage() {
  const { memberId = '' } = useParams();
  const memberQuery = useStaffMemberQuery(Number(memberId));

  if (memberQuery.isError) {
    if (isStatus(memberQuery.error, 404)) return <NotFoundPage />;
    if (isStatus(memberQuery.error, 403)) {
      return (
        <>
          <PageHeader title="Staff" />
          <NoAccess message="You don't have access to staff." />
        </>
      );
    }
    return (
      <>
        <PageHeader title="Staff" />
        <div className="flex flex-col items-start gap-3">
          <Alert tone="danger">Couldn&apos;t load this person. Try again.</Alert>
          <Button variant="secondary" onClick={() => memberQuery.refetch()}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  if (memberQuery.isPending) {
    return (
      <div className="flex justify-center p-10 text-text-tertiary">
        <Spinner label="Loading staff member" />
      </div>
    );
  }

  return <StaffMemberContent member={memberQuery.data} />;
}
