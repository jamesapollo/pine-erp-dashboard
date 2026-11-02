import { useSearchParams } from 'react-router-dom';

import { useInvitationQuery } from '@/hooks/api/queries/staff/useInvitationQuery';
import { AcceptInviteExistingAccount } from '@/components/auth/AcceptInviteExistingAccount';
import { AcceptInviteForm } from '@/components/auth/AcceptInviteForm';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { TextLink } from '@/components/ui/TextLink';
import { ROUTES } from '@/constants/routes';

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const invitationQuery = useInvitationQuery(token);
  const { data: invitation } = invitationQuery;

  if (!token || invitation === null) {
    return (
      <AuthLayout
        title="This invite link no longer works"
        description="It may have been used, cancelled or expired. Ask for a new invite."
      >
        <TextLink to={ROUTES.LOGIN}>Sign in</TextLink>
      </AuthLayout>
    );
  }

  if (invitation === undefined) {
    return (
      <AuthLayout title="Accept invitation" description="Join the store you were invited to.">
        {invitationQuery.isError ? (
          <Alert tone="danger">Something went wrong. Try again.</Alert>
        ) : (
          <Spinner label="Loading invitation" />
        )}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={`Join ${invitation.store.name}`}
      description={`You've been invited to join ${invitation.store.name} as ${invitation.email}.`}
    >
      {invitation.has_password ? (
        <AcceptInviteExistingAccount token={token} invitation={invitation} />
      ) : (
        <AcceptInviteForm token={token} invitation={invitation} />
      )}
    </AuthLayout>
  );
}
