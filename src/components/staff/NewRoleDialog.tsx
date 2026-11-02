import { useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useSaveRoleMutation } from '@/hooks/api/mutations/staff/useSaveRoleMutation';
import { roleSchema, type RoleInput } from '@/components/staff/roleSchema';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { getActionErrorMessage, getFieldError } from '@/utils/apiErrors';
import { buildRolePath } from '@/constants/routes';

// Render it only while open, so each opening starts empty. A new role has no permissions yet:
// the role editor it opens is where they are chosen.
export function NewRoleDialog({ onClose }: { onClose: () => void }) {
  const formId = useId();
  const navigate = useNavigate();
  const saveMutation = useSaveRoleMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoleInput>({
    resolver: zodResolver(roleSchema),
    mode: 'onSubmit',
    defaultValues: { name: '', description: '' },
  });

  const serverNameError = getFieldError(saveMutation.error, 'name');
  const serverDescriptionError = getFieldError(saveMutation.error, 'description');
  const hasServerFieldError = Boolean(serverNameError || serverDescriptionError);

  const onSubmit = handleSubmit((values) => {
    saveMutation.mutate(
      {
        body: {
          name: values.name,
          ...(values.description ? { description: values.description } : {}),
          permissions: [],
        },
      },
      { onSuccess: (role) => navigate(buildRolePath(role.id)) },
    );
  });

  return (
    <Dialog
      isOpen
      title="New role"
      description="You'll choose its permissions next."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={saveMutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} isLoading={saveMutation.isPending}>
            Create role
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} className="grid gap-3.5">
        {saveMutation.isError && !hasServerFieldError ? (
          <Alert tone="danger">{getActionErrorMessage(saveMutation.error)}</Alert>
        ) : null}
        <Input
          label="Name"
          autoFocus
          autoComplete="off"
          placeholder="e.g. Packer"
          error={errors.name?.message ?? serverNameError}
          {...register('name')}
        />
        <Textarea
          label="Description"
          optional
          rows={2}
          placeholder="What is this role for?"
          error={errors.description?.message ?? serverDescriptionError}
          {...register('description')}
        />
      </form>
    </Dialog>
  );
}
