import { isAxiosError } from 'axios';

import { useSignOut } from '@/hooks/useSignOut';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { getActionErrorMessage, isStatus } from '@/utils/apiErrors';

// A failed accept that is not a field error. A 403 carries the API's own explanation
// ("You're signed in as someone else."), so show it and offer to sign out.
export function AcceptInviteFailure({ error }: { error: unknown }) {
  const { signOut, isSigningOut, hasFailed } = useSignOut();
  const isForbidden = isStatus(error, 403);
  const apiMessage =
    isForbidden && isAxiosError<{ message?: string }>(error)
      ? error.response?.data.message
      : undefined;

  return (
    <>
      <Alert tone="danger">{apiMessage ?? getActionErrorMessage(error)}</Alert>
      {hasFailed ? <Alert tone="danger">Couldn&apos;t sign out. Try again.</Alert> : null}
      {isForbidden ? (
        <Button
          variant="secondary"
          size="lg"
          block
          type="button"
          isLoading={isSigningOut}
          onClick={() => void signOut()}
        >
          Sign out
        </Button>
      ) : null}
    </>
  );
}
