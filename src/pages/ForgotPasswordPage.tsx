import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { AuthLayout } from '@/components/layout/AuthLayout';

export function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset your password"
      description="Enter your work email and a reset link will be sent if an account exists."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
