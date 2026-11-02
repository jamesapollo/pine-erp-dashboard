import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { type InvitationPreview } from '@/types/staff';
import { useAcceptInvitationMutation } from '@/hooks/api/mutations/staff/useAcceptInvitationMutation';
import { AcceptInviteFailure } from '@/components/auth/AcceptInviteFailure';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getFieldError, isStatus } from '@/utils/apiErrors';

import { acceptInviteSchema, type AcceptInviteFormData } from './acceptInviteSchema';

// For a person with no account yet: they choose a name and a password, and are signed in on joining.
export function AcceptInviteForm({
  token,
  invitation,
}: {
  token: string;
  invitation: InvitationPreview;
}) {
  const acceptInvitationMutation = useAcceptInvitationMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema),
    mode: 'onSubmit',
  });

  const { error } = acceptInvitationMutation;
  const hasFieldError =
    isStatus(error, 422) &&
    (getFieldError(error, 'name') ||
      getFieldError(error, 'password') ||
      getFieldError(error, 'password_confirmation'));

  function onSubmit(data: AcceptInviteFormData) {
    if (acceptInvitationMutation.isPending) return;
    acceptInvitationMutation.mutate(
      { token, body: data },
      {
        onError: (mutationError) => {
          if (!isStatus(mutationError, 422)) return;
          for (const field of ['name', 'password', 'password_confirmation'] as const) {
            const message = getFieldError(mutationError, field);
            if (message) setError(field, { message });
          }
        },
      },
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {error && !hasFieldError ? <AcceptInviteFailure error={error} /> : null}
      <Input label="Email" type="email" value={invitation.email} readOnly autoComplete="username" />
      <Input
        label="Your name"
        autoComplete="name"
        error={errors.name?.message}
        {...register('name')}
      />
      <Input
        label="Password"
        type="password"
        hint="At least 12 characters."
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.password_confirmation?.message}
        {...register('password_confirmation')}
      />
      <Button
        variant="primary"
        size="lg"
        block
        type="submit"
        isLoading={acceptInvitationMutation.isPending}
      >
        {`Join ${invitation.store.name}`}
      </Button>
    </form>
  );
}
