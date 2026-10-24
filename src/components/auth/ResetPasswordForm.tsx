import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { useResetPasswordMutation } from '@/hooks/api/mutations/auth/useResetPasswordMutation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextLink } from '@/components/ui/TextLink';
import { getFieldError, getTooManyRequestsMessage, isStatus } from '@/utils/apiErrors';
import { ROUTES } from '@/constants/routes';

const resetPasswordSchema = z
  .object({
    password: z.string().min(12, 'Use at least 12 characters.'),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords don't match.",
    path: ['password_confirmation'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const resetPasswordMutation = useResetPasswordMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onSubmit',
  });

  const { error } = resetPasswordMutation;

  if (!token || !email) {
    return (
      <>
        <p className="m-0">This reset link is incomplete. Request a new one.</p>
        <TextLink to={ROUTES.FORGOT_PASSWORD}>Request a new reset link</TextLink>
      </>
    );
  }

  if (isStatus(error, 422) && getFieldError(error, 'email')) {
    return (
      <>
        <p className="m-0">This reset link is invalid or has expired.</p>
        <TextLink to={ROUTES.FORGOT_PASSWORD}>Request a new reset link</TextLink>
      </>
    );
  }

  function onSubmit(data: ResetPasswordFormData) {
    if (resetPasswordMutation.isPending || !token || !email) return;
    resetPasswordMutation.mutate(
      { token, email, ...data },
      {
        onSuccess: () => {
          void navigate(ROUTES.LOGIN, { replace: true, state: { notice: 'passwordReset' } });
        },
        onError: (mutationError) => {
          const passwordError = getFieldError(mutationError, 'password');
          if (isStatus(mutationError, 422) && passwordError) {
            setError('password', { message: passwordError });
          }
        },
      },
    );
  }

  const isPasswordRuleError = isStatus(error, 422) && getFieldError(error, 'password');

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {isStatus(error, 429) ? (
        <Alert tone="danger">{getTooManyRequestsMessage(error)}</Alert>
      ) : error && !isPasswordRuleError ? (
        <Alert tone="danger">Something went wrong. Try again.</Alert>
      ) : null}
      <Input label="Email" type="email" value={email} readOnly autoComplete="username" />
      <Input
        label="New password"
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
        isLoading={resetPasswordMutation.isPending}
      >
        Save password
      </Button>
    </form>
  );
}
