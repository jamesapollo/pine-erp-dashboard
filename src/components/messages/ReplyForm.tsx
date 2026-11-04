import { useState, type FormEvent } from 'react';

import { useReplyToEnquiryMutation } from '@/hooks/api/mutations/enquiries/useReplyToEnquiryMutation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { getActionErrorMessage } from '@/utils/apiErrors';

export const REPLY_MAX_LENGTH = 10000;

export function ReplyForm({ enquiryId, email }: { enquiryId: number; email: string }) {
  const replyMutation = useReplyToEnquiryMutation(enquiryId);
  const [body, setBody] = useState('');
  const [emptyError, setEmptyError] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) {
      setEmptyError(true);
      return;
    }
    replyMutation.mutate({ body: trimmed }, { onSuccess: () => setBody('') });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
      {replyMutation.isError ? (
        <Alert tone="danger">{getActionErrorMessage(replyMutation.error)}</Alert>
      ) : null}
      <Textarea
        label="Reply"
        rows={5}
        maxLength={REPLY_MAX_LENGTH}
        value={body}
        hint={`Sent by email to ${email}.`}
        error={emptyError ? 'Write a reply before sending.' : undefined}
        onChange={(event) => {
          setBody(event.target.value);
          setEmptyError(false);
        }}
      />
      <div>
        <Button type="submit" disabled={replyMutation.isPending}>
          {replyMutation.isPending ? 'Sending…' : 'Send reply'}
        </Button>
      </div>
    </form>
  );
}
