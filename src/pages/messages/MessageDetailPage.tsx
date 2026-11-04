import { useParams } from 'react-router-dom';

import { type EnquiryDetail } from '@/types/enquiry';
import { useChangeEnquiryStatusMutation } from '@/hooks/api/mutations/enquiries/useChangeEnquiryStatusMutation';
import { useResendEnquiryReplyMutation } from '@/hooks/api/mutations/enquiries/useResendEnquiryReplyMutation';
import { useEnquiryQuery } from '@/hooks/api/queries/enquiries/useEnquiryQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { ReplyForm } from '@/components/messages/ReplyForm';
import { ReplyThread } from '@/components/messages/ReplyThread';
import { Alert } from '@/components/ui/Alert';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CopyButton } from '@/components/ui/CopyButton';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { getActionErrorMessage, isStatus } from '@/utils/apiErrors';
import { formatDateTime } from '@/utils/movementTime';
import { ROUTES } from '@/constants/routes';

const CONFLICT_MESSAGE = 'This message changed — refresh to see the latest';

function MessageDetailContent({ enquiry }: { enquiry: EnquiryDetail }) {
  const { hasPermission } = useAuthedSession();
  const canManage = hasPermission('enquiries.manage');
  const statusMutation = useChangeEnquiryStatusMutation(enquiry.id);
  const resendMutation = useResendEnquiryReplyMutation(enquiry.id);
  const isClosed = enquiry.status === 'closed';

  const actionError = statusMutation.error ?? resendMutation.error;

  return (
    <>
      <PageHeader
        back={<BackLink to={ROUTES.MESSAGES}>Messages</BackLink>}
        title={enquiry.name}
        sub={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <span>{enquiry.email}</span>
            <CopyButton value={enquiry.email} label="Copy email" />
            <span aria-hidden="true">·</span>
            <span>{enquiry.topic ?? 'No topic'}</span>
            <span aria-hidden="true">·</span>
            <span>Received {formatDateTime(enquiry.created_at)}</span>
          </span>
        }
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge kind="enquiry" status={enquiry.status} />
            {canManage ? (
              <Button
                variant="secondary"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ status: isClosed ? 'new' : 'closed' })}
              >
                {isClosed ? 'Reopen' : 'Close'}
              </Button>
            ) : null}
          </div>
        }
      />
      {actionError ? (
        <div className="mb-4">
          <Alert tone="danger">
            {isStatus(actionError, 409) ? CONFLICT_MESSAGE : getActionErrorMessage(actionError)}
          </Alert>
        </div>
      ) : null}
      <div className="flex max-w-[720px] flex-col gap-4">
        <Card title="Message">
          <p className="m-0 whitespace-pre-wrap break-words text-sm leading-normal text-text-primary">
            {enquiry.message}
          </p>
        </Card>
        <ReplyThread
          replies={enquiry.replies}
          canManage={canManage}
          resendingReplyId={resendMutation.isPending ? resendMutation.variables : undefined}
          onResend={(replyId) => resendMutation.mutate(replyId)}
        />
        {canManage ? (
          <Card title={isClosed ? 'Reply and reopen' : 'Reply'}>
            <ReplyForm enquiryId={enquiry.id} email={enquiry.email} />
          </Card>
        ) : null}
      </div>
    </>
  );
}

export function MessageDetailPage() {
  const { enquiryId = '' } = useParams();
  const enquiryQuery = useEnquiryQuery(Number(enquiryId));

  if (enquiryQuery.isError) {
    if (isStatus(enquiryQuery.error, 404)) return <NotFoundPage />;
    if (isStatus(enquiryQuery.error, 403)) {
      return (
        <>
          <PageHeader title="Message" />
          <NoAccess message="You don't have access to messages." />
        </>
      );
    }
    return (
      <>
        <PageHeader title="Message" />
        <div className="flex flex-col items-start gap-3">
          <Alert tone="danger">Couldn&apos;t load this message. Try again.</Alert>
          <Button variant="secondary" onClick={() => enquiryQuery.refetch()}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  if (enquiryQuery.isPending) {
    return (
      <div className="flex justify-center p-10 text-text-tertiary">
        <Spinner label="Loading message" />
      </div>
    );
  }

  return <MessageDetailContent enquiry={enquiryQuery.data} />;
}
