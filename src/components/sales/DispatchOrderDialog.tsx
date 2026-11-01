import { useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Truck } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';

import { type Courier, type Delivery, type Order } from '@/types/sales';
import { useCreateOrderDeliveryMutation } from '@/hooks/api/mutations/sales/useCreateOrderDeliveryMutation';
import { useDispatchOrderMutation } from '@/hooks/api/mutations/sales/useDispatchOrderMutation';
import { useUpdateDeliveryTrackingMutation } from '@/hooks/api/mutations/sales/useUpdateDeliveryTrackingMutation';
import { useCouriersQuery } from '@/hooks/api/queries/sales/useCouriersQuery';
import { useDeliveryQuery } from '@/hooks/api/queries/sales/useDeliveryQuery';
import { DetailRow } from '@/components/sales/DetailRow';
import {
  dispatchOrderSchema,
  type DispatchOrderInput,
} from '@/components/sales/dispatchOrderSchema';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Radio } from '@/components/ui/Radio';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { getActionErrorMessage } from '@/utils/apiErrors';

const TITLE = 'Dispatch order';
const DESCRIPTIONS = {
  courier: 'Hand the parcel over, then dispatch it here.',
  pickup: 'The buyer can collect it from the store.',
} as const;
const METHOD_LABELS = { courier: 'Courier', pickup: 'Pickup' } as const;

type SavedTracking = { courierId: number | null; trackingNumber: string | null };

/**
 * Dispatches a confirmed order: creates its delivery when there is none (or updates the courier
 * and number of the one being prepared), then dispatches it. Render it only while open.
 */
export function DispatchOrderDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  // The delivery the order had on opening. One created from this dialog keeps the form on screen.
  const [openingDeliveryId] = useState(() => order.delivery?.id ?? null);
  const couriersQuery = useCouriersQuery();
  const deliveryQuery = useDeliveryQuery(openingDeliveryId ?? 0);
  const isReady =
    couriersQuery.isSuccess && (openingDeliveryId === null || deliveryQuery.isSuccess);

  if (!isReady) {
    const loadError = couriersQuery.error ?? deliveryQuery.error;
    return (
      <Dialog
        isOpen
        title={TITLE}
        onClose={onClose}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Not yet
            </Button>
            <Button disabled>
              <Icon icon={Truck} size={16} />
              Dispatch
            </Button>
          </>
        }
      >
        {loadError ? (
          <Alert tone="danger">{getActionErrorMessage(loadError)}</Alert>
        ) : (
          <div className="flex justify-center py-6 text-text-tertiary">
            <Spinner />
          </div>
        )}
      </Dialog>
    );
  }

  return (
    <DispatchOrderForm
      order={order}
      activeCouriers={couriersQuery.data.filter((courier) => courier.is_active)}
      openingDelivery={deliveryQuery.data ?? null}
      onClose={onClose}
    />
  );
}

function DispatchOrderForm({
  order,
  activeCouriers,
  openingDelivery,
  onClose,
}: {
  order: Order;
  activeCouriers: Courier[];
  openingDelivery: Delivery | null;
  onClose: () => void;
}) {
  const formId = useId();
  const createDeliveryMutation = useCreateOrderDeliveryMutation(order.id);
  const trackingMutation = useUpdateDeliveryTrackingMutation(order.delivery?.id ?? 0);
  const dispatchMutation = useDispatchOrderMutation(order.id);
  const [submitError, setSubmitError] = useState<unknown>(null);
  // The courier and number the API holds for the delivery, to tell whether they changed.
  const [savedTracking, setSavedTracking] = useState<SavedTracking | null>(() =>
    openingDelivery
      ? {
          courierId: openingDelivery.courier_id,
          trackingNumber: openingDelivery.tracking_number,
        }
      : null,
  );
  const hasActiveCouriers = activeCouriers.length > 0;
  const openingCourierId = openingDelivery?.courier_id;
  const isOpeningCourierActive = activeCouriers.some((courier) => courier.id === openingCourierId);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DispatchOrderInput>({
    resolver: zodResolver(dispatchOrderSchema),
    mode: 'onSubmit',
    defaultValues: {
      method: order.delivery?.method ?? (hasActiveCouriers ? 'courier' : 'pickup'),
      courierId: isOpeningCourierActive ? String(openingCourierId) : '',
      trackingNumber: openingDelivery?.tracking_number ?? '',
    },
  });
  const chosenMethod = useWatch({ control, name: 'method' });
  // Once the order has a delivery its method is fixed.
  const method = order.delivery?.method ?? chosenMethod;
  const isFeePending = order.delivery_fee_pending;

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const tracking: SavedTracking =
      method === 'courier'
        ? { courierId: Number(values.courierId), trackingNumber: values.trackingNumber || null }
        : { courierId: null, trackingNumber: null };
    try {
      if (!order.delivery) {
        await createDeliveryMutation.mutateAsync(
          method === 'courier'
            ? {
                method,
                courier_id: tracking.courierId ?? undefined,
                ...(tracking.trackingNumber ? { tracking_number: tracking.trackingNumber } : {}),
              }
            : { method },
        );
        setSavedTracking(tracking);
      } else if (
        method === 'courier' &&
        (tracking.courierId !== savedTracking?.courierId ||
          tracking.trackingNumber !== savedTracking?.trackingNumber)
      ) {
        await trackingMutation.mutateAsync({
          courier_id: tracking.courierId,
          tracking_number: tracking.trackingNumber,
        });
        setSavedTracking(tracking);
      }
      await dispatchMutation.mutateAsync();
      onClose();
    } catch (error) {
      // Whatever already went through stays; trying again picks up from there.
      setSubmitError(error);
    }
  });

  return (
    <Dialog
      isOpen
      title={TITLE}
      description={DESCRIPTIONS[method]}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={isSubmitting} onClick={onClose}>
            Not yet
          </Button>
          <Button type="submit" form={formId} disabled={isFeePending} isLoading={isSubmitting}>
            <Icon icon={Truck} size={16} />
            Dispatch
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-3.5">
        {isFeePending ? <Alert tone="warning">Set the delivery fee before dispatch.</Alert> : null}
        {submitError ? <Alert tone="danger">{getActionErrorMessage(submitError)}</Alert> : null}
        {order.delivery ? (
          <dl className="m-0">
            <DetailRow label="Method">{METHOD_LABELS[order.delivery.method]}</DetailRow>
          </dl>
        ) : (
          <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
            <legend className="sr-only">Method</legend>
            <div className="flex gap-5">
              <Radio
                label={METHOD_LABELS.courier}
                value="courier"
                disabled={!hasActiveCouriers}
                {...register('method')}
              />
              <Radio label={METHOD_LABELS.pickup} value="pickup" {...register('method')} />
            </div>
            {hasActiveCouriers ? null : (
              <span className="text-xs leading-[1.4] text-text-tertiary">
                No active couriers. Choose pickup, or ask an owner to add a courier.
              </span>
            )}
          </fieldset>
        )}
        {method === 'courier' ? (
          <>
            <Select
              label="Courier"
              placeholder="Select a courier"
              hint={
                hasActiveCouriers
                  ? undefined
                  : 'No active couriers. Ask an owner to add or switch one on.'
              }
              options={activeCouriers.map((courier) => ({
                value: String(courier.id),
                label: courier.name,
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
