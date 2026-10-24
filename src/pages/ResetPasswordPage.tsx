import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { AuthLayout } from '@/components/layout/AuthLayout';

export function ResetPasswordPage() {
  return (
    <AuthLayout title="Set a new password" description="Choose a new password for your account.">
      <ResetPasswordForm />
    </AuthLayout>
  );
}
