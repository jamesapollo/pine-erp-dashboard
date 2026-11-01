import {
  CircleAlert,
  CircleCheck,
  MessageSquare,
  Package,
  PackageCheck,
  RotateCw,
  Truck,
  Undo2,
  X,
} from 'lucide-react';

import { type DeliveryMethod, type DeliveryTimelineEvent } from '@/types/sales';
import { type TimelineItem } from '@/components/ui/Timeline';
import { formatMovementTime } from '@/utils/movementTime';

/** A timeline item with the moment it happened, so lists from different sources can be merged. */
export type TimelineEntry = { happenedAt: string; item: TimelineItem };

type EventDescription = Pick<TimelineItem, 'title' | 'tone' | 'icon' | 'note'> & {
  details?: (string | null)[];
};

function describeEvent(
  event: DeliveryTimelineEvent,
  method: DeliveryMethod,
  courierName: string | null,
  trackingNumber: string | null,
): EventDescription {
  const isPickup = method === 'pickup';
  if (event.type === 'note' || event.to_status === null) {
    return { title: 'Note', icon: MessageSquare, note: event.note ?? undefined };
  }
  switch (event.to_status) {
    case 'preparing':
      return { title: 'Delivery created', icon: Package };
    case 'dispatched':
      if (event.from_status === 'failed') {
        return {
          title: 'Retried · dispatched again',
          tone: 'filled',
          icon: RotateCw,
          details: [courierName],
        };
      }
      return {
        title: isPickup ? 'Ready for collection' : 'Dispatched',
        tone: 'filled',
        icon: PackageCheck,
        details: [courierName],
      };
    case 'in_transit':
      return {
        title: 'In transit',
        tone: 'info',
        icon: Truck,
        details: [courierName, trackingNumber],
      };
    case 'delivered':
      return { title: isPickup ? 'Collected' : 'Delivered', tone: 'filled', icon: CircleCheck };
    case 'failed':
      return {
        title: 'Delivery failed',
        tone: 'danger',
        icon: CircleAlert,
        note: event.note ?? undefined,
      };
    case 'returned':
      return { title: 'Returned to store', icon: Undo2 };
    case 'cancelled':
      return { title: 'Cancelled with the order', tone: 'danger', icon: X };
  }
}

/** Joins the meta parts with " · ", leaving out empty ones; undefined when nothing is left. */
export function joinMeta(parts: (string | null | undefined)[]): string | undefined {
  const present = parts.filter((part): part is string => Boolean(part));
  return present.length > 0 ? present.join(' · ') : undefined;
}

/**
 * Newest first; events in the same moment keep the later one (higher id) on top.
 *
 * The delivery only knows its current courier and tracking number, so they are credited to the
 * latest dispatch (or retry) and the events after it. Older dispatched and in-transit events show
 * only who did them, since a retry may have used another courier. With no dispatch in the history
 * at all, nothing older exists to mislabel, so every event may carry them.
 */
export function toDeliveryTimelineEntries(
  events: DeliveryTimelineEvent[],
  method: DeliveryMethod,
  courierName: string | null,
  trackingNumber: string | null,
): TimelineEntry[] {
  const newestFirst = [...events].sort(
    (first, second) =>
      new Date(second.created_at).getTime() - new Date(first.created_at).getTime() ||
      second.id - first.id,
  );
  const latestDispatchIndex = newestFirst.findIndex((event) => event.to_status === 'dispatched');
  return newestFirst.map((event, index) => {
    const isCurrentDispatch = latestDispatchIndex === -1 || index <= latestDispatchIndex;
    const { details = [], ...description } = describeEvent(
      event,
      method,
      isCurrentDispatch ? courierName : null,
      isCurrentDispatch ? trackingNumber : null,
    );
    const actorName = event.actor?.name;
    return {
      happenedAt: event.created_at,
      item: {
        id: `delivery-event-${event.id}`,
        time: formatMovementTime(event.created_at),
        meta: joinMeta([actorName ? `by ${actorName}` : null, ...details]),
        ...description,
      },
    };
  });
}

export function toDeliveryTimelineItems(
  events: DeliveryTimelineEvent[],
  method: DeliveryMethod,
  courierName: string | null,
  trackingNumber: string | null,
): TimelineItem[] {
  return toDeliveryTimelineEntries(events, method, courierName, trackingNumber).map(
    (entry) => entry.item,
  );
}
