import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SignOutError } from '@/components/ui/SignOutError';

export function NoStoreAccess({
  onSignOut,
  hasSignOutFailed = false,
}: {
  onSignOut: () => void;
  hasSignOutFailed?: boolean;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-app p-6">
      <Card className="flex w-full max-w-[400px] flex-col gap-4 p-8">
        <h1 className="text-xl font-semibold text-text-primary">
          You don't have access to a store yet
        </h1>
        <p className="text-sm text-text-secondary">Ask the store owner to check your account.</p>
        {hasSignOutFailed ? <SignOutError /> : null}
        <Button variant="secondary" onClick={onSignOut}>
          Sign out
        </Button>
      </Card>
    </main>
  );
}
