import { useId } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import { type Delivery } from '@/types/sales';
import { useAddDeliveryNoteMutation } from '@/hooks/api/mutations/sales/useAddDeliveryNoteMutation';
import {
  addDeliveryNoteSchema,
  type AddDeliveryNoteInput,
} from '@/components/sales/addDeliveryNoteSchema';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { getActionErrorMessage } from '@/utils/apiErrors';

// Render it only while open, so each opening starts with an empty note.
export function AddDeliveryNoteDialog({
  delivery,
  onClose,
}: {
  delivery: Delivery;
  onClose: () => void;
}) {
  const formId = useId();
  const noteMutation = useAddDeliveryNoteMutation(delivery.id);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AddDeliveryNoteInput>({
    resolver: zodResolver(addDeliveryNoteSchema),
    mode: 'onSubmit',
    defaultValues: { note: '' },
  });
  const note = useWatch({ control, name: 'note' });
  const hasNote = note.trim() !== '';

  const onSubmit = handleSubmit((values) => {
    noteMutation.mutate({ note: values.note }, { onSuccess: onClose });
  });

  return (
    <Dialog
      isOpen
      title="Add note"
      description="Notes appear on the timeline for everyone on the team."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={noteMutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={!hasNote}
            isLoading={noteMutation.isPending}
          >
            Add note
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {noteMutation.isError ? (
          <Alert tone="danger">{getActionErrorMessage(noteMutation.error)}</Alert>
        ) : null}
        <Textarea
          label="Note"
          placeholder="Rider says gate was locked, will try after 5 pm"
          autoFocus
          error={errors.note?.message}
          {...register('note')}
        />
      </form>
    </Dialog>
  );
}
