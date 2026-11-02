import { useEffect, useState } from 'react';
import { Link, useBlocker } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';
import { Trash2, Users } from 'lucide-react';
import { z } from 'zod';

import { type RoleDetail } from '@/types/staff';
import { useSaveRoleMutation } from '@/hooks/api/mutations/staff/useSaveRoleMutation';
import { usePermissionsQuery } from '@/hooks/api/queries/staff/usePermissionsQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { UnsavedChangesDialog } from '@/components/products/UnsavedChangesDialog';
import { DeleteRoleDialog } from '@/components/staff/DeleteRoleDialog';
import { roleSchema } from '@/components/staff/roleSchema';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormErrorMessage } from '@/components/ui/FormErrorMessage';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Textarea } from '@/components/ui/Textarea';
import { getActionErrorMessage, getFieldError } from '@/utils/apiErrors';
import { togglePermission } from '@/utils/rolePermissions';
import { HIDDEN_PERMISSION_SLUGS, PERMISSION_GROUPS } from '@/constants/permissions';
import { buildStaffMemberPath, ROUTES } from '@/constants/routes';

const roleEditorSchema = roleSchema.extend({ permissions: z.array(z.string()) });
type RoleEditorInput = z.infer<typeof roleEditorSchema>;

const visibleGroups = PERMISSION_GROUPS.map((group) => ({
  label: group.label,
  slugs: group.slugs.filter((slug) => !HIDDEN_PERMISSION_SLUGS.includes(slug)),
}));
const visiblePermissionCount = visibleGroups.reduce(
  (total, group) => total + group.slugs.length,
  0,
);

function getSavedValues(role: RoleDetail): RoleEditorInput {
  return {
    name: role.name,
    description: role.description ?? '',
    // The API adds the hidden permissions itself, so the form only holds the ones a person can choose.
    permissions: role.permissions.filter((slug) => !HIDDEN_PERMISSION_SLUGS.includes(slug)),
  };
}

function PermissionGroupCards({
  control,
  isReadOnly,
  onChange,
}: {
  control: Control<RoleEditorInput>;
  isReadOnly: boolean;
  onChange: (permissions: string[]) => void;
}) {
  const permissionsQuery = usePermissionsQuery();
  const selected = useWatch({ control, name: 'permissions' });
  const descriptions = new Map(
    (permissionsQuery.data ?? []).map((permission) => [permission.slug, permission.description]),
  );

  return (
    <div className="grid gap-4">
      {visibleGroups.map((group) => {
        const grantedCount = group.slugs.filter((slug) => selected.includes(slug)).length;
        const isAllGranted = grantedCount === group.slugs.length;
        const applyToGroup = () =>
          onChange(
            group.slugs.reduce(
              (current, slug) => togglePermission(current, slug, !isAllGranted),
              selected,
            ),
          );

        return (
          <Card
            key={group.label}
            flush
            title={group.label}
            actions={
              <>
                <span className="text-xs font-normal text-text-tertiary">
                  {grantedCount} of {group.slugs.length}
                </span>
                {isReadOnly ? null : (
                  <Button size="sm" variant="ghost" onClick={applyToGroup}>
                    {isAllGranted ? 'Clear all' : 'Select all'}
                  </Button>
                )}
              </>
            }
          >
            <ul className="m-0 list-none p-0">
              {group.slugs.map((slug, index) => (
                <li
                  key={slug}
                  className={`flex items-start gap-3 px-5 py-3 ${index > 0 ? 'border-t border-border-subtle' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <Checkbox
                      label={descriptions.get(slug) ?? slug}
                      checked={selected.includes(slug)}
                      disabled={isReadOnly}
                      onChange={(event) =>
                        onChange(togglePermission(selected, slug, event.target.checked))
                      }
                    />
                  </div>
                  <span className="font-mono text-xs text-text-tertiary">{slug}</span>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

function MembersCard({ role }: { role: RoleDetail }) {
  const count = role.members.length;
  return (
    <Card
      flush
      title="Members"
      subtitle={
        count
          ? `${count} ${count === 1 ? 'person has' : 'people have'} this role`
          : 'No one has this role yet'
      }
      actions={
        <Link
          to={ROUTES.STAFF}
          className="inline-flex items-center gap-1.5 rounded-control border border-border-default bg-surface-card px-2.5 py-1.5 text-[13px] font-medium text-text-primary no-underline hover:bg-neutral-50 focus-visible:shadow-focus focus-visible:outline-none"
        >
          <Icon icon={Users} />
          Assign on Staff page
        </Link>
      }
    >
      {count ? (
        <DataTable
          caption="Members"
          rows={role.members}
          getRowKey={(member) => member.member_id}
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (member) => (
                <span className="inline-flex items-center gap-2.5">
                  <Avatar name={member.name} size={28} />
                  <span>
                    <Link
                      to={buildStaffMemberPath(member.member_id)}
                      className="font-medium text-text-primary no-underline hover:underline focus-visible:rounded-chip focus-visible:shadow-focus focus-visible:outline-none"
                    >
                      {member.name}
                    </Link>
                    <span className="block text-xs text-text-tertiary">{member.email}</span>
                  </span>
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (member) => (
                <StatusBadge
                  kind="membership"
                  status={member.status === 'suspended' ? 'deactivated' : member.status}
                />
              ),
            },
          ]}
        />
      ) : (
        <EmptyState
          icon={Users}
          title="No members"
          description="Assign this role to people from the Staff page."
        />
      )}
    </Card>
  );
}

export function RoleEditorForm({ role }: { role: RoleDetail }) {
  const { hasPermission } = useAuthedSession();
  const saveMutation = useSaveRoleMutation();
  const [isDeleting, setIsDeleting] = useState(false);
  const isReadOnly = role.is_system || !hasPermission('staff.manage');
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<RoleEditorInput>({
    resolver: zodResolver(roleEditorSchema),
    mode: 'onSubmit',
    defaultValues: getSavedValues(role),
  });
  const isSaving = saveMutation.isPending;
  const permissions = useWatch({ control, name: 'permissions' });
  const memberCount = role.members.length;

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !isSaving && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!isDirty) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);

  const serverNameError = getFieldError(saveMutation.error, 'name');
  const serverDescriptionError = getFieldError(saveMutation.error, 'description');
  const serverPermissionsError = getFieldError(saveMutation.error, 'permissions');
  const hasServerFieldError = Boolean(
    serverNameError || serverDescriptionError || serverPermissionsError,
  );

  const onSubmit = handleSubmit((values) => {
    saveMutation.mutate(
      { roleId: role.id, body: values },
      { onSuccess: (saved) => reset(getSavedValues({ ...role, ...saved })) },
    );
  });

  let sub: string;
  if (role.slug === 'owner') sub = 'The Owner role always has every permission.';
  else sub = `${permissions.length} of ${visiblePermissionCount} permissions`;

  return (
    <>
      <form noValidate onSubmit={onSubmit}>
        <PageHeader
          back={<BackLink to={ROUTES.ROLES}>Roles</BackLink>}
          title={role.name}
          sub={sub}
          actions={
            isReadOnly ? null : (
              <Button type="submit" disabled={!isDirty} isLoading={isSaving}>
                Save role
              </Button>
            )
          }
        />
        <div className="grid gap-4">
          {role.is_system ? (
            <Alert tone="info">
              Built-in roles can&apos;t be changed. Create a custom role to choose permissions.
            </Alert>
          ) : null}
          {saveMutation.isError && !hasServerFieldError ? (
            <Alert tone="danger">{getActionErrorMessage(saveMutation.error)}</Alert>
          ) : null}
          <Card title="Details">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5">
              <Input
                label="Name"
                autoComplete="off"
                disabled={isReadOnly}
                error={errors.name?.message ?? serverNameError}
                {...register('name')}
              />
              <Textarea
                label="Description"
                rows={2}
                disabled={isReadOnly}
                error={errors.description?.message ?? serverDescriptionError}
                {...register('description')}
              />
            </div>
          </Card>
          <section>
            <h2 className="m-0 mb-1 text-[15px] font-semibold text-text-primary">Permissions</h2>
            <p className="m-0 mb-3 text-[13px] text-text-secondary">
              Grouped by module. Manage permissions include everything the matching View permission
              allows. Takes effect straight away.
            </p>
            <FormErrorMessage id="permissions-error" message={serverPermissionsError} />
            <Controller
              control={control}
              name="permissions"
              render={() => (
                <PermissionGroupCards
                  control={control}
                  isReadOnly={isReadOnly}
                  onChange={(next) => setValue('permissions', next, { shouldDirty: true })}
                />
              )}
            />
          </section>
          <MembersCard role={role} />
          {isReadOnly ? null : (
            <div>
              <Button
                variant="danger"
                disabled={memberCount > 0}
                onClick={() => setIsDeleting(true)}
              >
                <Icon icon={Trash2} />
                Delete role
              </Button>
              {memberCount > 0 ? (
                <p className="m-0 mt-1.5 text-xs text-text-tertiary">
                  Move {memberCount === 1 ? 'its member' : `its ${memberCount} members`} to another
                  role before deleting.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </form>
      {isDeleting ? <DeleteRoleDialog role={role} onClose={() => setIsDeleting(false)} /> : null}
      <UnsavedChangesDialog
        isOpen={blocker.state === 'blocked'}
        onKeepEditing={() => blocker.reset?.()}
        onDiscard={() => blocker.proceed?.()}
      />
    </>
  );
}
