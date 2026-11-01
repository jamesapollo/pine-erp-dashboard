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

import { type DeliveryTimelineEvent } from '@/types/sales';
import { buildDeliveryEventFixture } from '@/tests/fixtures/sales';
import { toDeliveryTimelineItems } from '@/utils/deliveryTimeline';
import { formatMovementTime } from '@/utils/movementTime';

function mapOne(
  overrides: Partial<DeliveryTimelineEvent>,
  {
    method = 'courier',
    courierName = 'Swift Riders',
    trackingNumber = 'KE88213',
  }: {
    method?: 'courier' | 'pickup';
    courierName?: string | null;
    trackingNumber?: string | null;
  } = {},
) {
  const [item] = toDeliveryTimelineItems(
    [buildDeliveryEventFixture(overrides)],
    method,
    courierName,
    trackingNumber,
  );
  return item;
}

const actor = { id: 2, name: 'Otieno O.' };

describe('toDeliveryTimelineItems', () => {
  it('maps the created event', () => {
    expect(mapOne({ id: 4, from_status: null, to_status: 'preparing', actor })).toEqual({
      id: 'delivery-event-4',
      title: 'Delivery created',
      time: formatMovementTime('2026-10-18T09:00:00+00:00'),
      meta: 'by Otieno O.',
      icon: Package,
    });
  });

  it('maps dispatch with the actor and courier', () => {
    expect(mapOne({ from_status: 'preparing', to_status: 'dispatched', actor })).toMatchObject({
      title: 'Dispatched',
      tone: 'filled',
      icon: PackageCheck,
      meta: 'by Otieno O. · Swift Riders',
    });
  });

  it('labels a pickup dispatch as ready for collection', () => {
    expect(
      mapOne(
        { from_status: 'preparing', to_status: 'dispatched', actor },
        { method: 'pickup', courierName: null, trackingNumber: null },
      ),
    ).toMatchObject({ title: 'Ready for collection', meta: 'by Otieno O.' });
  });

  it('titles a dispatch after a failure as a retry', () => {
    expect(mapOne({ from_status: 'failed', to_status: 'dispatched', actor })).toMatchObject({
      title: 'Retried · dispatched again',
      tone: 'filled',
      icon: RotateCw,
      meta: 'by Otieno O. · Swift Riders',
    });
  });

  it('maps in transit with the courier and tracking number', () => {
    expect(
      mapOne({ from_status: 'dispatched', to_status: 'in_transit', actor: null }),
    ).toMatchObject({
      title: 'In transit',
      tone: 'info',
      icon: Truck,
      meta: 'Swift Riders · KE88213',
    });
  });

  it('maps delivered and collected', () => {
    expect(mapOne({ from_status: 'in_transit', to_status: 'delivered', actor })).toMatchObject({
      title: 'Delivered',
      tone: 'filled',
      icon: CircleCheck,
    });
    expect(
      mapOne({ from_status: 'dispatched', to_status: 'delivered', actor }, { method: 'pickup' }),
    ).toMatchObject({ title: 'Collected' });
  });

  it('maps a failure with its note', () => {
    expect(
      mapOne({ from_status: 'in_transit', to_status: 'failed', note: 'Buyer unreachable', actor }),
    ).toMatchObject({
      title: 'Delivery failed',
      tone: 'danger',
      icon: CircleAlert,
      note: 'Buyer unreachable',
      meta: 'by Otieno O.',
    });
  });

  it('maps returned and cancelled', () => {
    expect(mapOne({ from_status: 'failed', to_status: 'returned', actor })).toMatchObject({
      title: 'Returned to store',
      icon: Undo2,
    });
    expect(mapOne({ from_status: 'preparing', to_status: 'cancelled', actor })).toMatchObject({
      title: 'Cancelled with the order',
      tone: 'danger',
      icon: X,
    });
  });

  it('maps a note', () => {
    expect(
      mapOne({
        type: 'note',
        from_status: null,
        to_status: null,
        note: 'Buyer asked for an afternoon drop-off',
        actor,
      }),
    ).toMatchObject({
      title: 'Note',
      icon: MessageSquare,
      note: 'Buyer asked for an afternoon drop-off',
      meta: 'by Otieno O.',
    });
  });

  it('omits "by" when there is no actor or the actor has no name', () => {
    expect(mapOne({ to_status: 'preparing', actor: null }).meta).toBeUndefined();
    expect(mapOne({ to_status: 'preparing', actor: { id: 3, name: null } }).meta).toBeUndefined();
    expect(mapOne({ from_status: 'preparing', to_status: 'dispatched', actor: null }).meta).toBe(
      'Swift Riders',
    );
  });

  it('credits the current courier and tracking only from the latest dispatch on', () => {
    const items = toDeliveryTimelineItems(
      [
        buildDeliveryEventFixture({
          id: 1,
          from_status: 'preparing',
          to_status: 'dispatched',
          actor,
          created_at: '2026-10-18T09:00:00+00:00',
        }),
        buildDeliveryEventFixture({
          id: 2,
          from_status: 'dispatched',
          to_status: 'in_transit',
          actor: null,
          created_at: '2026-10-18T10:00:00+00:00',
        }),
        buildDeliveryEventFixture({
          id: 3,
          from_status: 'in_transit',
          to_status: 'failed',
          actor,
          created_at: '2026-10-18T11:00:00+00:00',
        }),
        buildDeliveryEventFixture({
          id: 4,
          from_status: 'failed',
          to_status: 'dispatched',
          actor,
          created_at: '2026-10-19T09:00:00+00:00',
        }),
        buildDeliveryEventFixture({
          id: 5,
          from_status: 'dispatched',
          to_status: 'in_transit',
          actor: null,
          created_at: '2026-10-19T10:00:00+00:00',
        }),
      ],
      'courier',
      'Rapid Couriers',
      'RC-200',
    );
    expect(items.map((item) => [item.id, item.meta])).toEqual([
      ['delivery-event-5', 'Rapid Couriers · RC-200'],
      ['delivery-event-4', 'by Otieno O. · Rapid Couriers'],
      ['delivery-event-3', 'by Otieno O.'],
      ['delivery-event-2', undefined],
      ['delivery-event-1', 'by Otieno O.'],
    ]);
  });

  it('lists events newest first', () => {
    const items = toDeliveryTimelineItems(
      [
        buildDeliveryEventFixture({ id: 1, created_at: '2026-10-18T09:00:00+00:00' }),
        buildDeliveryEventFixture({
          id: 2,
          from_status: 'preparing',
          to_status: 'dispatched',
          created_at: '2026-10-18T11:00:00+00:00',
        }),
        buildDeliveryEventFixture({
          id: 3,
          type: 'note',
          to_status: null,
          note: 'Same time, later id',
          created_at: '2026-10-18T11:00:00+00:00',
        }),
      ],
      'courier',
      'Swift Riders',
      null,
    );
    expect(items.map((item) => item.id)).toEqual([
      'delivery-event-3',
      'delivery-event-2',
      'delivery-event-1',
    ]);
  });
});
