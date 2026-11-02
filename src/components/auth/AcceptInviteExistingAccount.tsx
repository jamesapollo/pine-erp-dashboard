import { type InvitationPreview } from '@/types/staff';
import { useAcceptInvitationMutation } from '@/hooks/api/mutations/staff/useAcceptInvitationMutation';
import { useSession } from '@/hooks/useSession';
import { AcceptInviteFailure } from '@/components/auth/AcceptInviteFailure';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { TextLink } from '@/components/ui/TextLink';
import { ROUTES } from '@/constants/routes';

// For a person who already has an account: sign in as the invited email, then join with one button.
export function AcceptInviteExistingAccount({
  token,
  invitation,
}: {
  token: string;
  invitation: InvitationPreview;
}) {
  const session = useSession();
  const acceptInvitationMutation = useAcceptInvitationMutation();
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

  function onJoin() {
    if (acceptInvitationMutation.isPending) return;
    acceptInvitationMutation.mutate({ token });
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <AcceptInviteFailure error={error} /> : null}
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
    </div>
  );
}
