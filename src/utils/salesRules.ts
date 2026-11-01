import { type DeliveryMethod, type DeliveryStatus, type Order } from '@/types/sales';

const HOLD_WARNING_HOURS = 6;
const HOUR = 3_600_000;

export function getOrderActions(order: Order, canManage: boolean) {
  const deliveryStatus = order.delivery?.status;
  const isOpen = canManage;
  return {
    canConfirm: isOpen && order.status === 'pending',
    canCancel:
      isOpen &&
      (order.status === 'pending' ||
        order.status === 'confirmed' ||
        (order.status === 'dispatched' &&
          (deliveryStatus === 'failed' || deliveryStatus === 'returned'))),
    canDispatch: isOpen && order.status === 'confirmed',
    canComplete: isOpen && order.status === 'dispatched',
    isCompleteReady: isOpen && order.status === 'dispatched' && deliveryStatus === 'delivered',
    canSetFee: isOpen && (order.status === 'pending' || order.status === 'confirmed'),
  };
}

export function getDeliveryActions(
  delivery: { status: DeliveryStatus; method: DeliveryMethod },
  canManage: boolean,
) {
  const { status, method } = delivery;
  const isOut = status === 'dispatched' || status === 'in_transit';
  const isFinal = status === 'delivered' || status === 'returned' || status === 'cancelled';
  return {
    canMarkInTransit: canManage && status === 'dispatched' && method === 'courier',
    canMarkDelivered: canManage && isOut,
    canMarkFailed: canManage && isOut,
    canRetry: canManage && status === 'failed',
    canMarkReturned: canManage && status === 'failed',
    canEditTracking:
      canManage && method === 'courier' && (status === 'preparing' || status === 'failed'),
    canAddNote: canManage && !isFinal,
  };
}

export type OrderActions = ReturnType<typeof getOrderActions>;
export type DeliveryActions = ReturnType<typeof getDeliveryActions>;

/** True when a stock hold runs out within the next six hours (and has not already). */
export function isHoldEndingSoon(holdExpiresAt: string | null, now: Date = new Date()): boolean {
  if (!holdExpiresAt) return false;
  const remaining = new Date(holdExpiresAt).getTime() - now.getTime();
  return remaining > 0 && remaining <= HOLD_WARNING_HOURS * HOUR;
}
