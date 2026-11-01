import { Check, CircleCheck, ShoppingBag, X } from 'lucide-react';

import {
  buildDeliveryEventFixture,
  buildOrderDeliveryFixture,
  buildOrderFixture,
} from '@/tests/fixtures/sales';
import { formatDateTime } from '@/utils/movementTime';
import { buildOrderActivity } from '@/utils/orderActivity';

describe('buildOrderActivity', () => {
  it('shows a pending order as placed, with its stock hold', () => {
    const items = buildOrderActivity(buildOrderFixture());
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'order-placed',
      title: 'Order placed',
      icon: ShoppingBag,
      meta: `Storefront checkout · stock held until ${formatDateTime('2026-10-19T20:30:00+00:00')}`,
    });
  });

  it('merges the order and delivery events, newest first', () => {
    const items = buildOrderActivity(
      buildOrderFixture({
        status: 'completed',
        hold_expires_at: null,
        created_at: '2026-10-18T08:30:00+00:00',
        confirmed_at: '2026-10-18T09:00:00+00:00',
        dispatched_at: '2026-10-18T10:00:00+00:00',
        completed_at: '2026-10-18T15:00:00+00:00',
        delivery: buildOrderDeliveryFixture({
          status: 'delivered',
          timeline: [
            buildDeliveryEventFixture({
              id: 3,
              from_status: 'dispatched',
              to_status: 'delivered',
              created_at: '2026-10-18T14:00:00+00:00',
            }),
            buildDeliveryEventFixture({
              id: 2,
              from_status: 'preparing',
              to_status: 'dispatched',
              created_at: '2026-10-18T10:00:00+00:00',
            }),
            // Created in the same moment as the confirmation, so it sorts after it.
            buildDeliveryEventFixture({ id: 1, created_at: '2026-10-18T09:00:00+00:00' }),
          ],
        }),
      }),
    );

    expect(items.map((item) => item.title)).toEqual([
      'Order completed',
      'Delivered',
      'Dispatched',
      'Delivery created',
      'Order confirmed',
      'Order placed',
    ]);
    expect(items[0]).toMatchObject({ tone: 'success', icon: CircleCheck });
    expect(items[4]).toMatchObject({ tone: 'filled', icon: Check, meta: 'Stock committed' });
    expect(items[5].meta).toBe('Storefront checkout');
  });

  it('titles an automatic cancellation and explains it', () => {
    const items = buildOrderActivity(
      buildOrderFixture({
        status: 'cancelled',
        hold_expires_at: null,
        cancelled_at: '2026-10-19T20:30:00+00:00',
        cancel_reason: 'not_confirmed',
        cancelled_by: null,
      }),
    );
    expect(items[0]).toEqual({
      id: 'order-cancelled',
      title: 'Cancelled automatically',
      time: expect.any(String),
      tone: 'danger',
      icon: X,
      note: 'The stock hold ran out before the order was confirmed.',
    });
  });

  it('credits a staff cancellation and shows the reason', () => {
    const items = buildOrderActivity(
      buildOrderFixture({
        status: 'cancelled',
        hold_expires_at: null,
        cancelled_at: '2026-10-18T12:00:00+00:00',
        cancel_reason: 'Buyer changed their mind',
        cancelled_by: { id: 4, name: 'Amina H.' },
      }),
    );
    expect(items[0]).toMatchObject({
      title: 'Order cancelled',
      tone: 'danger',
      meta: 'by Amina H.',
      note: 'Buyer changed their mind',
    });
  });

  it('omits "by" when the canceller has no name', () => {
    const items = buildOrderActivity(
      buildOrderFixture({
        status: 'cancelled',
        hold_expires_at: null,
        cancelled_at: '2026-10-18T12:00:00+00:00',
        cancel_reason: 'Duplicate order',
        cancelled_by: { id: 4, name: null },
      }),
    );
    expect(items[0].meta).toBeUndefined();
  });
});
