import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { z } from 'zod';

import { useSignInMutation } from '@/hooks/api/mutations/auth/useSignInMutation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextLink } from '@/components/ui/TextLink';
import { getFieldError, getRetryAfterSeconds, isStatus } from '@/utils/apiErrors';
import { emailSchema } from '@/utils/emailSchema';
import { ROUTES } from '@/constants/routes';

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const location = useLocation();
  const signInMutation = useSignInMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema), mode: 'onSubmit' });

  const notice = (location.state as { notice?: string } | null)?.notice;
  const { error } = signInMutation;
  const hasEmailFieldError = isStatus(error, 422) && Boolean(getFieldError(error, 'email'));

  function onSubmit(data: LoginFormData) {
    if (signInMutation.isPending) return;
    signInMutation.mutate(data, {
      onError: (mutationError) => {
        const emailError = isStatus(mutationError, 422)
          ? getFieldError(mutationError, 'email')
          : undefined;
        if (emailError) setError('email', { message: emailError });
      },
    });
  }

  return (
    <>
      {notice === 'passwordReset' ? (
        <Alert tone="success">Password saved. Sign in with your new password.</Alert>
      ) : null}
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {isStatus(error, 429) ? (
          <Alert tone="danger">{tooManyAttemptsMessage(getRetryAfterSeconds(error))}</Alert>
        ) : error && !hasEmailFieldError ? (
          <Alert tone="danger">Something went wrong. Try again.</Alert>
        ) : null}
        <Input
          label="Email"
          type="email"
          autoComplete="username"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="flex justify-end">
          <TextLink to={ROUTES.FORGOT_PASSWORD}>Forgot password?</TextLink>
        </div>
        <Button
          variant="primary"
          size="lg"
          block
          type="submit"
          isLoading={signInMutation.isPending}
        >
          Sign in
        </Button>
      </form>
    </>
  );
}

function tooManyAttemptsMessage(seconds: number | undefined): string {
  return seconds === undefined
    ? 'Too many attempts. Try again in a minute.'
    : `Too many attempts. Try again in ${seconds} seconds.`;
}
