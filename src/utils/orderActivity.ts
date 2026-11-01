import { Check, CircleCheck, ShoppingBag, X } from 'lucide-react';

import { type Order } from '@/types/sales';
import { type TimelineItem } from '@/components/ui/Timeline';
import { joinMeta, toDeliveryTimelineEntries, type TimelineEntry } from '@/utils/deliveryTimeline';
import { formatDateTime, formatMovementTime } from '@/utils/movementTime';

// The hold-expiry job cancels unconfirmed orders with this reason instead of staff text.
const AUTOMATIC_CANCEL_REASON = 'not_confirmed';

function orderEntry(happenedAt: string, item: Omit<TimelineItem, 'time'>): TimelineEntry {
  return { happenedAt, item: { ...item, time: formatMovementTime(happenedAt) } };
}

/** The order's own milestones merged with its delivery's timeline, newest first. */
export function buildOrderActivity(order: Order): TimelineItem[] {
  const heldUntil = order.status === 'pending' ? order.hold_expires_at : null;
  // Oldest first, so that events in the same moment keep their natural order once reversed.
  const entries: TimelineEntry[] = [
    orderEntry(order.created_at, {
      id: 'order-placed',
      title: 'Order placed',
      icon: ShoppingBag,
      meta: joinMeta([
        'Storefront checkout',
        heldUntil ? `stock held until ${formatDateTime(heldUntil)}` : null,
      ]),
    }),
  ];

  if (order.confirmed_at) {
    entries.push(
      orderEntry(order.confirmed_at, {
        id: 'order-confirmed',
        title: 'Order confirmed',
        tone: 'filled',
        icon: Check,
        meta: 'Stock committed',
      }),
    );
  }

  if (order.delivery) {
    const { timeline, method, courier_name, tracking_number } = order.delivery;
    entries.push(
      ...toDeliveryTimelineEntries(timeline, method, courier_name, tracking_number).reverse(),
    );
  }

  if (order.completed_at) {
    entries.push(
      orderEntry(order.completed_at, {
        id: 'order-completed',
        title: 'Order completed',
        tone: 'success',
        icon: CircleCheck,
      }),
    );
  }

  if (order.cancelled_at) {
    const isAutomatic = order.cancel_reason === AUTOMATIC_CANCEL_REASON;
    const cancellerName = order.cancelled_by?.name;
    entries.push(
      orderEntry(order.cancelled_at, {
        id: 'order-cancelled',
        title: isAutomatic ? 'Cancelled automatically' : 'Order cancelled',
        tone: 'danger',
        icon: X,
        meta: cancellerName ? `by ${cancellerName}` : undefined,
        note: isAutomatic
          ? 'The stock hold ran out before the order was confirmed.'
          : (order.cancel_reason ?? undefined),
      }),
    );
  }

  return entries
    .map((entry, index) => ({ entry, index }))
    .sort(
      (first, second) =>
        new Date(second.entry.happenedAt).getTime() - new Date(first.entry.happenedAt).getTime() ||
        second.index - first.index,
    )
    .map(({ entry }) => entry.item);
}
