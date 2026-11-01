import { useId } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { type Order } from '@/types/sales';
import { useSetDeliveryFeeMutation } from '@/hooks/api/mutations/sales/useSetDeliveryFeeMutation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { deliveryFeeSchema, type DeliveryFeeInput } from '@/components/sales/deliveryFeeSchema';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { toMoneyInput } from '@/utils/money';

// Render it only while open, so each opening starts with an empty field.
export function DeliveryFeeDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const formId = useId();
  const feeMutation = useSetDeliveryFeeMutation(order.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeliveryFeeInput>({
    resolver: zodResolver(deliveryFeeSchema),
    mode: 'onSubmit',
    defaultValues: { fee: '' },
  });

  const onSubmit = handleSubmit(({ fee }) => {
    feeMutation.mutate({ amount: toMoneyInput(fee) }, { onSuccess: onClose });
  });

  return (
    <Dialog
      isOpen
      title="Set delivery fee"
      description="Agree the fee with the buyer first. It's added to the order total."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={feeMutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} isLoading={feeMutation.isPending}>
            Save fee
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {feeMutation.isError ? (
          <Alert tone="danger">{getActionErrorMessage(feeMutation.error)}</Alert>
        ) : null}
        <Input
          label="Fee"
          prefix="KES"
          inputMode="decimal"
          placeholder="350.00"
          autoFocus
          error={errors.fee?.message}
          {...register('fee')}
        />
      </form>
    </Dialog>
  );
}
