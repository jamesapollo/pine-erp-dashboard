import { type EnquiryReply } from '@/types/enquiry';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime } from '@/utils/movementTime';

export function ReplyThread({
  replies,
  canManage,
  resendingReplyId,
  onResend,
}: {
  replies: EnquiryReply[];
  canManage: boolean;
  // The reply whose resend is in flight, if any.
  resendingReplyId: number | undefined;
  onResend: (replyId: number) => void;
}) {
  if (replies.length === 0) return null;

  return (
    <ul aria-label="Replies" className="m-0 flex list-none flex-col gap-3 p-0">
      {replies.map((reply) => (
        <li
          key={reply.id}
          className="rounded-card border border-border-default bg-surface-sunken p-4"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <span className="font-medium text-text-primary">
                {reply.author_name ?? 'Former staff member'}
              </span>
              <span className="text-text-tertiary"> · {formatDateTime(reply.created_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge kind="reply" status={reply.mail_status} size="sm" />
              {canManage && reply.mail_status === 'failed' ? (
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label={`Resend reply from ${formatDateTime(reply.created_at)}`}
                  disabled={resendingReplyId === reply.id}
                  onClick={() => onResend(reply.id)}
                >
                  Resend
                </Button>
              ) : null}
            </div>
          </div>
          <p className="m-0 whitespace-pre-wrap break-words text-sm leading-normal text-text-primary">
            {reply.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
