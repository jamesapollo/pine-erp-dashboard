import { useId } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import { type Role } from '@/types/staff';
import { useInviteStaffMutation } from '@/hooks/api/mutations/staff/useInviteStaffMutation';
import { inviteStaffSchema, type InviteStaffInput } from '@/components/staff/inviteStaffSchema';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { getActionErrorMessage, getFieldError } from '@/utils/apiErrors';
import { countVisiblePermissions } from '@/utils/rolePermissions';

// Render it only while open, so each opening starts empty.
export function InviteStaffDialog({ roles, onClose }: { roles: Role[]; onClose: () => void }) {
  const formId = useId();
  const inviteMutation = useInviteStaffMutation();
  // The Owner role is never handed out by invitation.
  const assignableRoles = roles.filter((role) => role.slug !== 'owner');
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<InviteStaffInput>({
    resolver: zodResolver(inviteStaffSchema),
    mode: 'onSubmit',
    defaultValues: { email: '', roleId: '' },
  });
  const selectedRoleId = useWatch({ control, name: 'roleId' });
  const selectedRole = assignableRoles.find((role) => String(role.id) === selectedRoleId);

  const serverEmailError = getFieldError(inviteMutation.error, 'email');
  const serverRoleError = getFieldError(inviteMutation.error, 'role_id');
  const hasServerFieldError = Boolean(serverEmailError || serverRoleError);

  const onSubmit = handleSubmit((values) => {
    inviteMutation.mutate(
      { email: values.email.trim(), roleId: Number(values.roleId) },
      { onSuccess: onClose },
    );
  });

  return (
    <Dialog
      isOpen
      title="Invite staff"
      description="They get an email with a link to set up their account."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={inviteMutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} isLoading={inviteMutation.isPending}>
            Send invite
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} className="grid gap-3.5">
        {inviteMutation.isError && !hasServerFieldError ? (
          <Alert tone="danger">{getActionErrorMessage(inviteMutation.error)}</Alert>
        ) : null}
        <Input
          label="Email"
          type="email"
          autoFocus
          autoComplete="off"
          placeholder="name@example.com"
          error={errors.email?.message ?? serverEmailError}
          {...register('email')}
        />
        <Select
          label="Role"
          placeholder="Choose a role"
          options={assignableRoles.map((role) => ({ value: String(role.id), label: role.name }))}
          hint={
            selectedRole
              ? `${countVisiblePermissions(selectedRole.permissions)} permissions`
              : undefined
          }
          error={errors.roleId?.message ?? serverRoleError}
          {...register('roleId')}
        />
      </form>
    </Dialog>
  );
}
