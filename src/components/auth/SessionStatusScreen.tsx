import { Button } from '@/components/ui/Button';
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
      <main>
        <Spinner label="Loading your session" />
      </main>
    );
  }

  return (
    <main>
      <h1>Can't reach the server.</h1>
      <Button onClick={onRetry}>Try again</Button>
    </main>
  );
}
