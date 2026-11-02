import { useId } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import { type Role } from '@/types/staff';
import { useRolesQuery } from '@/hooks/api/queries/staff/useRolesQuery';
import { useInviteStaffMutation } from '@/hooks/api/mutations/staff/useInviteStaffMutation';
import { inviteStaffSchema, type InviteStaffInput } from '@/components/staff/inviteStaffSchema';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { getActionErrorMessage, getFieldError } from '@/utils/apiErrors';
import { countVisiblePermissions } from '@/utils/rolePermissions';
import { OWNER_ROLE_SLUG } from '@/constants/permissions';

const DIALOG_DESCRIPTION = "They'll get an email to set a password.";

// Render it only while open, so each opening starts empty. It loads the roles itself, so a
// failure to load them is shown here with a retry instead of leaving the button dead.
export function InviteStaffDialog({ onClose }: { onClose: () => void }) {
  const rolesQuery = useRolesQuery();

  if (rolesQuery.isSuccess) return <InviteStaffForm roles={rolesQuery.data} onClose={onClose} />;

  return (
    <Dialog
      isOpen
      title="Invite staff"
      description={DIALOG_DESCRIPTION}
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      {rolesQuery.isError ? (
        <div className="flex flex-col items-start gap-3">
          <Alert tone="danger">{getActionErrorMessage(rolesQuery.error)}</Alert>
          <Button variant="secondary" onClick={() => rolesQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="flex justify-center p-4 text-text-tertiary">
          <Spinner label="Loading roles" />
        </div>
      )}
    </Dialog>
  );
}

function InviteStaffForm({ roles, onClose }: { roles: Role[]; onClose: () => void }) {
  const formId = useId();
  const inviteMutation = useInviteStaffMutation();
  // The Owner role is never handed out by invitation.
  const assignableRoles = roles.filter((role) => role.slug !== OWNER_ROLE_SLUG);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<InviteStaffInput>({
    resolver: zodResolver(inviteStaffSchema),
    mode: 'onSubmit',
    // The usual choice is preselected; with no such role the placeholder asks for one.
    defaultValues: {
      email: '',
      roleId: String(assignableRoles.find((role) => role.slug === 'staff')?.id ?? ''),
    },
  });
  const selectedRoleId = useWatch({ control, name: 'roleId' });
  const selectedRole = assignableRoles.find((role) => String(role.id) === selectedRoleId);
  const permissionCount = selectedRole ? countVisiblePermissions(selectedRole.permissions) : 0;

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
      description={DIALOG_DESCRIPTION}
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
              ? `${permissionCount} ${permissionCount === 1 ? 'permission' : 'permissions'}`
              : undefined
          }
          error={errors.roleId?.message ?? serverRoleError}
          {...register('roleId')}
        />
      </form>
    </Dialog>
  );
}
