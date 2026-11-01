import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export function SessionStatusScreen({
  status,
  onRetry,
}: {
  status: 'loading' | 'error';
  onRetry?: () => void;
}) {
  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-app text-brand-600">
        <Spinner label="Loading your session" className="size-8 border-[3px]" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-app p-6">
      <Card flush className="w-full max-w-[400px]">
        <div className="flex flex-col gap-4 p-8">
          <h1 className="text-xl font-semibold text-text-primary">Can't reach the server.</h1>
          <Button onClick={onRetry}>Try again</Button>
        </div>
      </Card>
    </main>
  );
}
