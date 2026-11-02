import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { type Role, type StaffMember } from '@/types/staff';
import { useUpdateStaffMemberMutation } from '@/hooks/api/mutations/staff/useUpdateStaffMemberMutation';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Select } from '@/components/ui/Select';
import { getActionErrorMessage, getFieldError } from '@/utils/apiErrors';
import { buildRolePath } from '@/constants/routes';

// The role is chosen here but held by the page, which previews what it allows.
export function StaffRoleCard({
  member,
  roles,
  selectedRoleId,
  onSelectRole,
}: {
  member: StaffMember;
  roles: Role[];
  selectedRoleId: number | null;
  onSelectRole: (roleId: number | null) => void;
}) {
  const { hasPermission } = useAuthedSession();
  const canManage = hasPermission('staff.manage');
  const updateMutation = useUpdateStaffMemberMutation();
  const savedRoleId = member.role?.id ?? null;
  const isDirty = selectedRoleId !== savedRoleId;
  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  if (member.is_owner || !canManage) {
    return (
      <Card title="Role" subtitle="Decides what they can see and do">
        <div className="flex flex-wrap items-center gap-2">
          {member.role ? (
            <Badge tone={member.role.is_system ? 'primary' : 'neutral'}>{member.role.name}</Badge>
          ) : (
            <span className="text-text-disabled">—</span>
          )}
          {member.is_owner ? (
            <span className="text-[13px] text-text-secondary">
              The store owner’s role can’t be changed.
            </span>
          ) : null}
        </div>
      </Card>
    );
  }

  const serverRoleError =
    getFieldError(updateMutation.error, 'role_id') ?? getFieldError(updateMutation.error, 'member');

  return (
    <Card
      title="Role"
      subtitle="Decides what they can see and do"
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            disabled={!isDirty || updateMutation.isPending}
            onClick={() => {
              onSelectRole(savedRoleId);
              updateMutation.reset();
            }}
          >
            Discard
          </Button>
          <Button
            size="sm"
            disabled={!isDirty || selectedRoleId === null}
            isLoading={updateMutation.isPending}
            onClick={() => {
              if (selectedRoleId === null) return;
              updateMutation.mutate({ memberId: member.id, changes: { roleId: selectedRoleId } });
            }}
          >
            Save role
          </Button>
        </>
      }
    >
      <div className="grid gap-3.5">
        {updateMutation.isError && !serverRoleError ? (
          <Alert tone="danger">{getActionErrorMessage(updateMutation.error)}</Alert>
        ) : null}
        <Select
          label="Role"
          placeholder="Choose a role"
          value={selectedRoleId === null ? '' : String(selectedRoleId)}
          options={roles
            .filter((role) => role.slug !== 'owner')
            .map((role) => ({ value: String(role.id), label: role.name }))}
          hint="Takes effect straight away"
          error={serverRoleError}
          onChange={(event) => onSelectRole(event.target.value ? Number(event.target.value) : null)}
        />
        {selectedRole ? (
          <Link
            to={buildRolePath(selectedRole.id)}
            className="inline-flex w-fit items-center gap-1 rounded-chip text-[13px] font-medium text-text-secondary no-underline hover:text-text-primary focus-visible:shadow-focus focus-visible:outline-none"
          >
            Edit {selectedRole.name} role
            <Icon icon={ArrowRight} size={14} />
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
