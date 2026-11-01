import { useId } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import { type Order } from '@/types/sales';
import { useCancelOrderMutation } from '@/hooks/api/mutations/sales/useCancelOrderMutation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { cancelOrderSchema, type CancelOrderInput } from '@/components/sales/cancelOrderSchema';
import { getActionErrorMessage } from '@/utils/apiErrors';

// Render it only while open, so each opening starts with an empty reason.
export function CancelOrderDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const formId = useId();
  const cancelMutation = useCancelOrderMutation(order.id);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CancelOrderInput>({
    resolver: zodResolver(cancelOrderSchema),
    mode: 'onSubmit',
    defaultValues: { reason: '' },
  });
  const reason = useWatch({ control, name: 'reason' });
  const hasReason = reason.trim() !== '';

  const onSubmit = handleSubmit((values) => {
    cancelMutation.mutate({ reason: values.reason }, { onSuccess: onClose });
  });

  return (
    <Dialog
      isOpen
      title="Cancel this order?"
      description="Its stock goes back on sale. The buyer isn't notified automatically."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={cancelMutation.isPending} onClick={onClose}>
            Keep order
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="danger"
            disabled={!hasReason}
            isLoading={cancelMutation.isPending}
          >
            Cancel order
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {cancelMutation.isError ? (
          <Alert tone="danger">{getActionErrorMessage(cancelMutation.error)}</Alert>
        ) : null}
        <Textarea
          label="Reason"
          placeholder="Buyer changed their mind"
          autoFocus
          error={errors.reason?.message}
          {...register('reason')}
        />
      </form>
    </Dialog>
  );
}
