import { useState } from 'react';
import { CircleCheck, RotateCw, Truck, Undo2 } from 'lucide-react';

import { type Delivery } from '@/types/sales';
import { useMarkDeliveryDeliveredMutation } from '@/hooks/api/mutations/sales/useMarkDeliveryDeliveredMutation';
import { useMarkDeliveryInTransitMutation } from '@/hooks/api/mutations/sales/useMarkDeliveryInTransitMutation';
import { DeliveryTrackingDialog } from '@/components/sales/DeliveryTrackingDialog';
import { MarkDeliveryFailedDialog } from '@/components/sales/MarkDeliveryFailedDialog';
import { MarkDeliveryReturnedDialog } from '@/components/sales/MarkDeliveryReturnedDialog';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { type DeliveryActions } from '@/utils/salesRules';

type OpenDialog = 'failed' | 'returned' | 'retry' | null;

/** The delivery header's buttons, shown per status and method by `getDeliveryActions`. */
export function DeliveryHeaderActions({
  delivery,
  actions,
}: {
  delivery: Delivery;
  actions: DeliveryActions;
}) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const inTransitMutation = useMarkDeliveryInTransitMutation(delivery.id);
  const deliveredMutation = useMarkDeliveryDeliveredMutation(delivery.id);
  const isBusy = inTransitMutation.isPending || deliveredMutation.isPending;
  const isPickup = delivery.method === 'pickup';
  const closeDialog = () => setOpenDialog(null);

  if (
    !actions.canMarkInTransit &&
    !actions.canMarkFailed &&
    !actions.canMarkDelivered &&
    !actions.canMarkReturned &&
    !actions.canRetry
  ) {
    return null;
  }

  return (
    <>
      {actions.canMarkInTransit ? (
        <Button
          variant="secondary"
          disabled={isBusy}
          isLoading={inTransitMutation.isPending}
          onClick={() => inTransitMutation.mutate()}
        >
          <Icon icon={Truck} size={16} />
          Mark in transit
        </Button>
      ) : null}
      {actions.canMarkFailed ? (
        <Button variant="secondary" disabled={isBusy} onClick={() => setOpenDialog('failed')}>
          {isPickup ? 'Not collected' : 'Mark failed'}
        </Button>
      ) : null}
      {actions.canMarkDelivered ? (
        <Button
          disabled={isBusy}
          isLoading={deliveredMutation.isPending}
          onClick={() => deliveredMutation.mutate()}
        >
          <Icon icon={CircleCheck} size={16} />
          {isPickup ? 'Mark collected' : 'Mark delivered'}
        </Button>
      ) : null}
      {actions.canMarkReturned ? (
        <Button variant="secondary" onClick={() => setOpenDialog('returned')}>
          <Icon icon={Undo2} size={16} />
          Mark returned
        </Button>
      ) : null}
      {actions.canRetry ? (
        <Button onClick={() => setOpenDialog('retry')}>
          <Icon icon={RotateCw} size={16} />
          Retry delivery
        </Button>
      ) : null}
      {openDialog === 'failed' ? (
        <MarkDeliveryFailedDialog delivery={delivery} onClose={closeDialog} />
      ) : null}
      {openDialog === 'returned' ? (
        <MarkDeliveryReturnedDialog delivery={delivery} onClose={closeDialog} />
      ) : null}
      {openDialog === 'retry' ? (
        <DeliveryTrackingDialog mode="retry" delivery={delivery} onClose={closeDialog} />
      ) : null}
    </>
  );
}
