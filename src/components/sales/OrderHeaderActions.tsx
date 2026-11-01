import { useState } from 'react';
import { Check, CircleCheck, Truck } from 'lucide-react';

import { type Order } from '@/types/sales';
import { useCompleteOrderMutation } from '@/hooks/api/mutations/sales/useCompleteOrderMutation';
import { useConfirmOrderMutation } from '@/hooks/api/mutations/sales/useConfirmOrderMutation';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CancelOrderDialog } from '@/components/sales/CancelOrderDialog';
import { DispatchOrderDialog } from '@/components/sales/DispatchOrderDialog';
import { type OrderActions } from '@/utils/salesRules';

/** The order header's buttons, shown per status by `getOrderActions`. */
export function OrderHeaderActions({ order, actions }: { order: Order; actions: OrderActions }) {
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isDispatchDialogOpen, setIsDispatchDialogOpen] = useState(false);
  const confirmMutation = useConfirmOrderMutation(order.id);
  const completeMutation = useCompleteOrderMutation(order.id);
  const isBusy = confirmMutation.isPending || completeMutation.isPending;

  if (!actions.canConfirm && !actions.canCancel && !actions.canDispatch && !actions.canComplete) {
    return null;
  }

  return (
    <>
      {actions.canCancel ? (
        <Button variant="secondary" disabled={isBusy} onClick={() => setIsCancelDialogOpen(true)}>
          Cancel
        </Button>
      ) : null}
      {actions.canDispatch ? (
        <Button disabled={isBusy} onClick={() => setIsDispatchDialogOpen(true)}>
          <Icon icon={Truck} size={16} />
          Dispatch
        </Button>
      ) : null}
      {actions.canConfirm ? (
        <Button
          disabled={isBusy}
          isLoading={confirmMutation.isPending}
          onClick={() => confirmMutation.mutate()}
        >
          <Icon icon={Check} size={16} />
          Confirm order
        </Button>
      ) : null}
      {actions.canComplete ? (
        <Button
          disabled={isBusy || !actions.isCompleteReady}
          isLoading={completeMutation.isPending}
          onClick={() => completeMutation.mutate()}
        >
          <Icon icon={CircleCheck} size={16} />
          Mark completed
        </Button>
      ) : null}
      {isCancelDialogOpen ? (
        <CancelOrderDialog order={order} onClose={() => setIsCancelDialogOpen(false)} />
      ) : null}
      {isDispatchDialogOpen ? (
        <DispatchOrderDialog order={order} onClose={() => setIsDispatchDialogOpen(false)} />
      ) : null}
    </>
  );
}
