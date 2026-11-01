import { useId } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { RotateCw } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { type Courier, type Delivery } from '@/types/sales';
import { useRetryDeliveryMutation } from '@/hooks/api/mutations/sales/useRetryDeliveryMutation';
import { useUpdateDeliveryTrackingMutation } from '@/hooks/api/mutations/sales/useUpdateDeliveryTrackingMutation';
import { useCouriersQuery } from '@/hooks/api/queries/sales/useCouriersQuery';
import {
  deliveryTrackingSchema,
  type DeliveryTrackingInput,
} from '@/components/sales/deliveryTrackingSchema';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useToastContext } from '@/components/ui/ToastContext';
import { getActionErrorMessage } from '@/utils/apiErrors';

type DeliveryTrackingMode = 'edit' | 'retry';

const COPY = {
  edit: { title: 'Edit tracking', description: 'Leave a field empty to clear it.', submit: 'Save' },
  retry: {
    title: 'Retry delivery',
    description:
      'Sends it out again as dispatched. Leave fields as they are to keep the current courier and tracking.',
    submit: 'Retry',
  },
} as const;

const PICKUP_RETRY_DESCRIPTION = 'Makes it ready for collection again.';

function getDescription(mode: DeliveryTrackingMode, delivery: Delivery): string {
  return mode === 'retry' && delivery.method === 'pickup'
    ? PICKUP_RETRY_DESCRIPTION
    : COPY[mode].description;
}

function SubmitLabel({ mode }: { mode: DeliveryTrackingMode }) {
  return (
    <>
      {mode === 'retry' ? <Icon icon={RotateCw} size={16} /> : null}
      {COPY[mode].submit}
    </>
  );
}

/**
 * Edits a delivery's courier and tracking number, or retries a failed delivery with them.
 * Only changed fields are sent. Render it only while open.
 */
export function DeliveryTrackingDialog({
  mode,
  delivery,
  onClose,
}: {
  mode: DeliveryTrackingMode;
  delivery: Delivery;
  onClose: () => void;
}) {
  const couriersQuery = useCouriersQuery();

  // A pickup has no courier or tracking to choose.
  if (delivery.method === 'pickup') {
    return <DeliveryTrackingForm mode={mode} delivery={delivery} couriers={[]} onClose={onClose} />;
  }

  if (!couriersQuery.isSuccess) {
    return (
      <Dialog
        isOpen
        title={COPY[mode].title}
        description={getDescription(mode, delivery)}
        onClose={onClose}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled>
              <SubmitLabel mode={mode} />
            </Button>
          </>
        }
      >
        {couriersQuery.isError ? (
          <Alert tone="danger">{getActionErrorMessage(couriersQuery.error)}</Alert>
        ) : (
          <div className="flex justify-center py-6 text-text-tertiary">
            <Spinner />
          </div>
        )}
      </Dialog>
    );
  }

  // Active couriers can be chosen; the current one stays listed even if it was deactivated.
  const couriers = couriersQuery.data.filter(
    (courier) => courier.is_active || courier.id === delivery.courier_id,
  );
  return (
    <DeliveryTrackingForm mode={mode} delivery={delivery} couriers={couriers} onClose={onClose} />
  );
}

function DeliveryTrackingForm({
  mode,
  delivery,
  couriers,
  onClose,
}: {
  mode: DeliveryTrackingMode;
  delivery: Delivery;
  couriers: Courier[];
  onClose: () => void;
}) {
  const formId = useId();
  const { showToast } = useToastContext();
  const trackingMutation = useUpdateDeliveryTrackingMutation(delivery.id);
  const retryMutation = useRetryDeliveryMutation(delivery.id);
  const activeMutation = mode === 'retry' ? retryMutation : trackingMutation;
  const isCourier = delivery.method === 'courier';
  const isCurrentCourierListed = couriers.some((courier) => courier.id === delivery.courier_id);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeliveryTrackingInput>({
    resolver: zodResolver(deliveryTrackingSchema),
    mode: 'onSubmit',
    defaultValues: {
      courierId: isCurrentCourierListed ? String(delivery.courier_id) : '',
      trackingNumber: delivery.tracking_number ?? '',
    },
  });

  const onSubmit = handleSubmit((values) => {
    const courierId = values.courierId === '' ? null : Number(values.courierId);
    const trackingNumber = values.trackingNumber === '' ? null : values.trackingNumber;
    const isCourierChanged = isCourier && courierId !== delivery.courier_id;
    const isTrackingNumberChanged = isCourier && trackingNumber !== delivery.tracking_number;

    if (mode === 'retry') {
      // An empty field keeps the current value, so only filled-in changes are sent.
      retryMutation.mutate(
        {
          ...(isCourierChanged && courierId !== null ? { courier_id: courierId } : {}),
          ...(isTrackingNumberChanged && trackingNumber !== null
            ? { tracking_number: trackingNumber }
            : {}),
        },
        { onSuccess: onClose },
      );
      return;
    }

    if (!isCourierChanged && !isTrackingNumberChanged) {
      onClose();
      return;
    }
    trackingMutation.mutate(
      {
        ...(isCourierChanged ? { courier_id: courierId } : {}),
        ...(isTrackingNumberChanged ? { tracking_number: trackingNumber } : {}),
      },
      {
        onSuccess: (updated) => {
          showToast({ title: 'Tracking updated', description: updated.order_reference });
          onClose();
        },
      },
    );
  });

  // Retrying can't clear the courier, so "No courier" is only offered when there is none.
  const courierPlaceholder = mode === 'edit' || !isCurrentCourierListed ? 'No courier' : undefined;

  return (
    <Dialog
      isOpen
      title={COPY[mode].title}
      description={getDescription(mode, delivery)}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={activeMutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} isLoading={activeMutation.isPending}>
            <SubmitLabel mode={mode} />
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-3.5">
        {activeMutation.isError ? (
          <Alert tone="danger">{getActionErrorMessage(activeMutation.error)}</Alert>
        ) : null}
        {isCourier ? (
          <>
            <Select
              label="Courier"
              placeholder={courierPlaceholder}
              options={couriers.map((courier) => ({
                value: String(courier.id),
                label: courier.is_active ? courier.name : `${courier.name} (inactive)`,
              }))}
              error={errors.courierId?.message}
              {...register('courierId')}
            />
            <Input
              label="Tracking number"
              hint="Optional"
              placeholder="KE88213"
              error={errors.trackingNumber?.message}
              {...register('trackingNumber')}
            />
          </>
        ) : null}
      </form>
    </Dialog>
  );
}
