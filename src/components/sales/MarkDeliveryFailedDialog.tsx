import { useId } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import { type Delivery } from '@/types/sales';
import { useMarkDeliveryFailedMutation } from '@/hooks/api/mutations/sales/useMarkDeliveryFailedMutation';
import {
  markDeliveryFailedSchema,
  type MarkDeliveryFailedInput,
} from '@/components/sales/markDeliveryFailedSchema';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { getActionErrorMessage } from '@/utils/apiErrors';

// Render it only while open, so each opening starts with an empty reason.
export function MarkDeliveryFailedDialog({
  delivery,
  onClose,
}: {
  delivery: Delivery;
  onClose: () => void;
}) {
  const formId = useId();
  const failedMutation = useMarkDeliveryFailedMutation(delivery.id);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<MarkDeliveryFailedInput>({
    resolver: zodResolver(markDeliveryFailedSchema),
    mode: 'onSubmit',
    defaultValues: { reason: '' },
  });
  const reason = useWatch({ control, name: 'reason' });
  const hasReason = reason.trim() !== '';

  const onSubmit = handleSubmit((values) => {
    failedMutation.mutate({ reason: values.reason }, { onSuccess: onClose });
  });

  return (
    <Dialog
      isOpen
      title={delivery.method === 'pickup' ? 'Not collected?' : 'Mark delivery failed?'}
      description="The reason shows on the timeline. You can retry or mark it returned afterwards."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={failedMutation.isPending} onClick={onClose}>
            Back
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="danger"
            disabled={!hasReason}
            isLoading={failedMutation.isPending}
          >
            Mark failed
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {failedMutation.isError ? (
          <Alert tone="danger">{getActionErrorMessage(failedMutation.error)}</Alert>
        ) : null}
        <Textarea
          label="Reason"
          placeholder="Buyer not reachable on phone"
          autoFocus
          error={errors.reason?.message}
          {...register('reason')}
        />
      </form>
    </Dialog>
  );
}
