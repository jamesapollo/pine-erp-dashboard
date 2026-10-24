import { LoginForm } from '@/components/auth/LoginForm';
import { AuthLayout } from '@/components/layout/AuthLayout';

export function LoginPage() {
  return (
    <AuthLayout title="Sign in" description="Sign in with your work email.">
      <LoginForm />
    </AuthLayout>
  );
}
