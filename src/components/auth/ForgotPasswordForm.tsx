import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useForgotPasswordMutation } from '@/hooks/api/mutations/auth/useForgotPasswordMutation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextLink } from '@/components/ui/TextLink';
import { emailSchema } from '@/utils/emailSchema';
import { getFieldError, getTooManyRequestsMessage, isStatus } from '@/utils/apiErrors';
import { ROUTES } from '@/constants/routes';

const forgotPasswordSchema = z.object({ email: emailSchema });

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const forgotPasswordMutation = useForgotPasswordMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onSubmit',
  });

  const { error, isSuccess, variables } = forgotPasswordMutation;

  function onSubmit(data: ForgotPasswordFormData) {
    if (forgotPasswordMutation.isPending) return;
    forgotPasswordMutation.mutate(data, {
      onError: (mutationError) => {
        if (isStatus(mutationError, 422)) {
          setError('email', {
            message: getFieldError(mutationError, 'email') ?? 'Enter a valid email.',
          });
        }
      },
    });
  }

  if (isSuccess) {
    return (
      <>
        <Alert tone="success">
          Check your email. If an account exists for {variables.email}, a reset link is on its way.
          The link expires in 60 minutes.
        </Alert>
        <TextLink to={ROUTES.LOGIN}>Back to sign in</TextLink>
      </>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {isStatus(error, 429) ? (
        <Alert tone="danger">{getTooManyRequestsMessage(error)}</Alert>
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
      <Button
        variant="primary"
        size="lg"
        block
        type="submit"
        isLoading={forgotPasswordMutation.isPending}
      >
        Send reset link
      </Button>
      <TextLink to={ROUTES.LOGIN}>Back to sign in</TextLink>
    </form>
  );
}
