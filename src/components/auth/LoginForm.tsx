import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { useSignInMutation } from '@/hooks/api/mutations/auth/useSignInMutation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getFieldError, getRetryAfterSeconds, isStatus } from '@/utils/apiErrors';
import { emailSchema } from '@/utils/emailSchema';
import { getSafeRedirectPath } from '@/utils/safeRedirect';
import { ROUTES } from '@/constants/routes';

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const signInMutation = useSignInMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema), mode: 'onSubmit' });

  const notice = (location.state as { notice?: string } | null)?.notice;
  const { error } = signInMutation;

  function onSubmit(data: LoginFormData) {
    if (signInMutation.isPending) return;
    signInMutation.mutate(data, {
      onSuccess: () => {
        void navigate(getSafeRedirectPath(searchParams.get('redirect')), { replace: true });
      },
      onError: (mutationError) => {
        if (isStatus(mutationError, 422)) {
          setError('email', { message: getFieldError(mutationError, 'email') });
        }
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
        ) : error && !isStatus(error, 422) ? (
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
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="text-[13px] font-medium leading-none text-text-link no-underline hover:underline"
          >
            Forgot password?
          </Link>
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
