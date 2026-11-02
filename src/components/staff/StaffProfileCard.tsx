import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { type StaffMember } from '@/types/staff';
import { useUpdateStaffMemberMutation } from '@/hooks/api/mutations/staff/useUpdateStaffMemberMutation';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { staffNameSchema, type StaffNameInput } from '@/components/staff/staffNameSchema';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { getActionErrorMessage, getFieldError } from '@/utils/apiErrors';
import { formatDateTime } from '@/utils/movementTime';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-t border-border-default py-2.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="text-right text-text-primary">{value}</span>
    </div>
  );
}

export function StaffProfileCard({ member }: { member: StaffMember }) {
  const { hasPermission } = useAuthedSession();
  const canManage = hasPermission('staff.manage');
  const updateMutation = useUpdateStaffMemberMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<StaffNameInput>({
    resolver: zodResolver(staffNameSchema),
    mode: 'onSubmit',
    // Follows the saved name, so a save (or a refresh) leaves the form clean.
    values: { name: member.name },
  });

  const serverNameError = getFieldError(updateMutation.error, 'name');
  const onSubmit = handleSubmit((values) => {
    updateMutation.mutate({ memberId: member.id, changes: { name: values.name } });
  });

  return (
    <Card
      title="Profile"
      footer={
        canManage ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              disabled={!isDirty || updateMutation.isPending}
              onClick={() => {
                reset();
                updateMutation.reset();
              }}
            >
              Discard
            </Button>
            <Button
              size="sm"
              type="submit"
              form="staff-profile-form"
              disabled={!isDirty}
              isLoading={updateMutation.isPending}
            >
              Save name
            </Button>
          </>
        ) : undefined
      }
    >
      <form id="staff-profile-form" noValidate onSubmit={onSubmit} className="grid gap-3.5">
        {updateMutation.isError && !serverNameError ? (
          <Alert tone="danger">{getActionErrorMessage(updateMutation.error)}</Alert>
        ) : null}
        <Input
          label="Name"
          autoComplete="off"
          disabled={!canManage}
          error={errors.name?.message ?? serverNameError}
          {...register('name')}
        />
        <Input
          label="Email"
          value={member.email}
          disabled
          readOnly
          hint="People change their own email from their account."
        />
      </form>
      <div className="mt-4">
        <DetailRow
          label="Joined"
          value={member.joined_at ? formatDateTime(member.joined_at) : '—'}
        />
        <DetailRow
          label="Last active"
          value={member.last_active_at ? formatDateTime(member.last_active_at) : 'Never'}
        />
      </div>
    </Card>
  );
}
