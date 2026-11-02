import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';

import { type InvitationPreview } from '@/types/staff';
import { useAcceptInvitationMutation } from '@/hooks/api/mutations/staff/useAcceptInvitationMutation';
import { useSession } from '@/hooks/useSession';
import { useSignOut } from '@/hooks/useSignOut';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { TextLink } from '@/components/ui/TextLink';
import { getActionErrorMessage, isStatus } from '@/utils/apiErrors';
import { ROUTES } from '@/constants/routes';

// For a person who already has an account: sign in as the invited email, then join with one button.
export function AcceptInviteExistingAccount({
  token,
  invitation,
}: {
  token: string;
  invitation: InvitationPreview;
}) {
  const navigate = useNavigate();
  const session = useSession();
  const acceptInvitationMutation = useAcceptInvitationMutation();
  const { signOut, isSigningOut, hasFailed } = useSignOut();
  const storeName = invitation.store.name;

  if (session.status === 'loading') return <Spinner label="Loading" />;

  if (session.status === 'anon') {
    const returnPath = `${ROUTES.ACCEPT_INVITE}?token=${encodeURIComponent(token)}`;
    return (
      <TextLink to={`${ROUTES.LOGIN}?redirect=${encodeURIComponent(returnPath)}`}>
        {`Sign in as ${invitation.email} to join ${storeName}`}
      </TextLink>
    );
  }

  const { error } = acceptInvitationMutation;
  // The API explains a 403 ("You're signed in as someone else."), so show its words.
  const errorMessage =
    isStatus(error, 403) &&
    isAxiosError<{ message?: string }>(error) &&
    error.response?.data.message
      ? error.response.data.message
      : error
        ? getActionErrorMessage(error)
        : null;

  function onJoin() {
    if (acceptInvitationMutation.isPending) return;
    acceptInvitationMutation.mutate(
      { token },
      {
        onSuccess: () => {
          void navigate(ROUTES.ROOT, { replace: true });
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}
      {hasFailed ? <Alert tone="danger">Couldn&apos;t sign out. Try again.</Alert> : null}
      <Button
        variant="primary"
        size="lg"
        block
        type="button"
        isLoading={acceptInvitationMutation.isPending}
        onClick={onJoin}
      >
        {`Join ${storeName}`}
      </Button>
      {isStatus(error, 403) ? (
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
    </div>
  );
}
