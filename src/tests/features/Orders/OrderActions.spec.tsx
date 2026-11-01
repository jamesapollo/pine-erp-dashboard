import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type Order } from '@/types/sales';
import { customRenderAtRoute } from '@/tests/customRender';
import { buildMoney } from '@/tests/fixtures/catalogue';
import { buildOrderDeliveryFixture, buildOrderFixture } from '@/tests/fixtures/sales';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

const REFERENCE = 'ZN7K-Q4M2-X9TD';

function buildUserWithoutOrdersManage() {
  const user = buildUserFixture();
  return buildUserFixture({
    memberships: user.memberships.map((membership) => ({
      ...membership,
      permissions: membership.permissions.filter((slug) => slug !== 'orders.manage'),
    })),
  });
}

// Serves the order (one response per GET, the last one repeating) and counts the GETs.
function respondWithOrder(orders: Order | Order[], user = buildUserFixture()) {
  const responses = Array.isArray(orders) ? orders : [orders];
  const counter = { gets: 0 };
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.order, () => {
      const order = responses[Math.min(counter.gets, responses.length - 1)];
      counter.gets += 1;
      return HttpResponse.json({ data: order });
    }),
  );
  return counter;
}

function buildPendingOrder(overrides: Partial<Order> = {}) {
  return buildOrderFixture({ id: 12, status: 'pending', ...overrides });
}

function buildDispatchedOrder(deliveryStatus: 'in_transit' | 'delivered' | 'failed') {
  return buildOrderFixture({
    id: 12,
    status: 'dispatched',
    hold_expires_at: null,
    confirmed_at: '2026-10-18T09:00:00+00:00',
    dispatched_at: '2026-10-18T10:00:00+00:00',
    delivery: buildOrderDeliveryFixture({
      status: deliveryStatus,
      status_label: { in_transit: 'In transit', delivered: 'Delivered', failed: 'Failed' }[
        deliveryStatus
      ],
    }),
  });
}

async function findHeaderButton(name: string) {
  await screen.findByRole('heading', { name: `Order ${REFERENCE}` });
  return within(screen.getByRole('main')).getByRole('button', { name });
}

// The timeline can carry the same words as a toast, so look only inside the toasts.
async function findToast(title: string) {
  return waitFor(() => {
    const toast = screen
      .getAllByRole('status')
      .find((candidate) => within(candidate).queryByText(title) !== null);
    expect(toast).toBeDefined();
    return within(toast as HTMLElement);
  });
}

function getItemsCard() {
  return within(screen.getByRole('heading', { name: 'Items' }).closest('section') as HTMLElement);
}

function stepState(label: string) {
  return within(screen.getByRole('group', { name: 'Order progress' }))
    .getByText(label)
    .closest('[data-state]')
    ?.getAttribute('data-state');
}

describe('Order actions', () => {
  it('confirms a pending order', async () => {
    const user = userEvent.setup();
    respondWithOrder(buildPendingOrder());
    let isConfirmed = false;
    server.use(
      http.post(mockEndpoints.orderConfirm, () => {
        isConfirmed = true;
        return HttpResponse.json({
          data: buildPendingOrder({
            status: 'confirmed',
            hold_expires_at: null,
            confirmed_at: '2026-10-18T09:00:00+00:00',
          }),
        });
      }),
    );
    customRenderAtRoute({ url: '/orders/12' });

    await user.click(await findHeaderButton('Confirm order'));

    const toast = await findToast('Order confirmed');
    expect(toast.getByText(REFERENCE)).toBeVisible();
    expect(isConfirmed).toBe(true);
    expect(stepState('Confirmed')).toBe('current');
    expect(screen.queryByRole('button', { name: 'Confirm order' })).not.toBeInTheDocument();
  });

  it('shows an expired stock hold and reloads the order', async () => {
    const user = userEvent.setup();
    const counter = respondWithOrder([
      buildPendingOrder(),
      buildPendingOrder({
        status: 'cancelled',
        hold_expires_at: null,
        cancelled_at: '2026-10-19T20:31:00+00:00',
        cancel_reason: 'not_confirmed',
      }),
    ]);
    server.use(
      http.post(mockEndpoints.orderConfirm, () =>
        HttpResponse.json(
          { message: "This order's stock hold has expired.", code: 'hold_expired' },
          { status: 409 },
        ),
      ),
    );
    customRenderAtRoute({ url: '/orders/12' });

    await user.click(await findHeaderButton('Confirm order'));

    expect(await screen.findByText("This order's stock hold has expired.")).toBeVisible();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Confirm order' })).not.toBeInTheDocument();
    });
    expect(counter.gets).toBe(2);
    expect(screen.getByText('Cancelled automatically')).toBeVisible();
  });

  it('sets a pending delivery fee', async () => {
    const user = userEvent.setup();
    respondWithOrder(
      buildPendingOrder({
        delivery_fee_pending: true,
        delivery_charge: { zone_name: null, fee: null, source: null, pending_quote: true },
      }),
    );
    const bodies: unknown[] = [];
    server.use(
      http.put(mockEndpoints.orderDeliveryFee, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({
          data: buildPendingOrder({
            delivery_charge: {
              zone_name: null,
              fee: buildMoney('350.00'),
              source: 'quote',
              pending_quote: false,
            },
            grand_total: buildMoney('4850.00'),
          }),
        });
      }),
    );
    customRenderAtRoute({ url: '/orders/12' });

    await screen.findByRole('heading', { name: 'Items' });
    await user.click(getItemsCard().getByRole('button', { name: 'Set fee' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Set delivery fee' }));
    expect(
      dialog.getByText("Agree the fee with the buyer first. It's added to the order total."),
    ).toBeVisible();
    const feeInput = dialog.getByLabelText('Fee');
    expect(feeInput).toHaveAttribute('placeholder', '350.00');

    await user.type(feeInput, 'abc');
    await user.click(dialog.getByRole('button', { name: 'Save fee' }));
    expect(await dialog.findByText('Enter a fee — 0 for free')).toBeVisible();
    expect(bodies).toEqual([]);

    await user.clear(feeInput);
    await user.type(feeInput, '350');
    await user.click(dialog.getByRole('button', { name: 'Save fee' }));

    const toast = await findToast('Delivery fee set');
    expect(toast.getByText(REFERENCE)).toBeVisible();
    expect(bodies).toEqual([{ amount: '350.00' }]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getItemsCard().getByText('KES 350.00')).toBeVisible();
    expect(getItemsCard().getByRole('button', { name: 'Change' })).toBeVisible();
  });

  it('accepts a free delivery fee', async () => {
    const user = userEvent.setup();
    respondWithOrder(buildPendingOrder());
    const bodies: unknown[] = [];
    server.use(
      http.put(mockEndpoints.orderDeliveryFee, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ data: buildPendingOrder() });
      }),
    );
    customRenderAtRoute({ url: '/orders/12' });

    await screen.findByRole('heading', { name: 'Items' });
    await user.click(getItemsCard().getByRole('button', { name: 'Change' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Set delivery fee' }));
    await user.type(dialog.getByLabelText('Fee'), '0');
    await user.click(dialog.getByRole('button', { name: 'Save fee' }));

    expect(await screen.findByText('Delivery fee set')).toBeVisible();
    expect(bodies).toEqual([{ amount: '0.00' }]);
  });

  it('shows a refused fee change inside the dialog and reloads the order', async () => {
    const user = userEvent.setup();
    const counter = respondWithOrder(buildPendingOrder());
    server.use(
      http.put(mockEndpoints.orderDeliveryFee, () =>
        HttpResponse.json(
          { message: "The delivery fee can't change after dispatch.", code: 'delivery_fee_locked' },
          { status: 409 },
        ),
      ),
    );
    customRenderAtRoute({ url: '/orders/12' });

    await screen.findByRole('heading', { name: 'Items' });
    await user.click(getItemsCard().getByRole('button', { name: 'Change' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Set delivery fee' }));
    await user.type(dialog.getByLabelText('Fee'), '400');
    await user.click(dialog.getByRole('button', { name: 'Save fee' }));

    expect(await dialog.findByText("The delivery fee can't change after dispatch.")).toBeVisible();
    await waitFor(() => {
      expect(counter.gets).toBe(2);
    });
  });

  it('cancels an order with a reason', async () => {
    const user = userEvent.setup();
    respondWithOrder(buildPendingOrder());
    const bodies: unknown[] = [];
    server.use(
      http.post(mockEndpoints.orderCancel, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({
          data: buildPendingOrder({
            status: 'cancelled',
            hold_expires_at: null,
            cancelled_at: '2026-10-18T09:00:00+00:00',
            cancel_reason: 'Buyer changed their mind',
          }),
        });
      }),
    );
    customRenderAtRoute({ url: '/orders/12' });

    await user.click(await findHeaderButton('Cancel'));

    const dialog = within(await screen.findByRole('dialog', { name: 'Cancel this order?' }));
    expect(
      dialog.getByText("Its stock goes back on sale. The buyer isn't notified automatically."),
    ).toBeVisible();
    const reason = dialog.getByLabelText('Reason');
    expect(reason).toHaveAttribute('placeholder', 'Buyer changed their mind');
    const cancelButton = dialog.getByRole('button', { name: 'Cancel order' });
    expect(cancelButton).toBeDisabled();

    await user.type(reason, '   ');
    expect(cancelButton).toBeDisabled();

    await user.clear(reason);
    await user.type(reason, 'Buyer changed their mind');
    await user.click(cancelButton);

    const toast = await findToast('Order cancelled');
    expect(toast.getByText(REFERENCE)).toBeVisible();
    expect(bodies).toEqual([{ reason: 'Buyer changed their mind' }]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm order' })).not.toBeInTheDocument();
  });

  it('caps the cancel reason at 255 characters', async () => {
    const user = userEvent.setup();
    respondWithOrder(buildPendingOrder());
    const bodies: unknown[] = [];
    server.use(
      http.post(mockEndpoints.orderCancel, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ data: buildPendingOrder({ status: 'cancelled' }) });
      }),
    );
    customRenderAtRoute({ url: '/orders/12' });

    await user.click(await findHeaderButton('Cancel'));
    const dialog = within(await screen.findByRole('dialog', { name: 'Cancel this order?' }));
    await user.click(dialog.getByLabelText('Reason'));
    await user.paste('a'.repeat(256));
    await user.click(dialog.getByRole('button', { name: 'Cancel order' }));

    expect(await dialog.findByText('Keep the reason to 255 characters or fewer')).toBeVisible();
    expect(bodies).toEqual([]);
  });

  it('keeps the order when the dialog is dismissed', async () => {
    const user = userEvent.setup();
    respondWithOrder(buildPendingOrder());
    customRenderAtRoute({ url: '/orders/12' });

    await user.click(await findHeaderButton('Cancel'));
    const dialog = within(await screen.findByRole('dialog', { name: 'Cancel this order?' }));
    await user.click(dialog.getByRole('button', { name: 'Keep order' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm order' })).toBeVisible();
  });

  it('shows a refused cancel inside the dialog and reloads the order', async () => {
    const user = userEvent.setup();
    const counter = respondWithOrder(buildPendingOrder());
    server.use(
      http.post(mockEndpoints.orderCancel, () =>
        HttpResponse.json(
          {
            message: "This order is confirmed and can't be moved that way.",
            code: 'invalid_transition',
          },
          { status: 409 },
        ),
      ),
    );
    customRenderAtRoute({ url: '/orders/12' });

    await user.click(await findHeaderButton('Cancel'));
    const dialog = within(await screen.findByRole('dialog', { name: 'Cancel this order?' }));
    await user.type(dialog.getByLabelText('Reason'), 'Duplicate order');
    await user.click(dialog.getByRole('button', { name: 'Cancel order' }));

    expect(
      await dialog.findByText("This order is confirmed and can't be moved that way."),
    ).toBeVisible();
    await waitFor(() => {
      expect(counter.gets).toBe(2);
    });
  });

  it('offers cancel but not dispatch-time actions on a confirmed order', async () => {
    respondWithOrder(
      buildPendingOrder({
        status: 'confirmed',
        hold_expires_at: null,
        confirmed_at: '2026-10-18T09:00:00+00:00',
      }),
    );
    customRenderAtRoute({ url: '/orders/12' });

    expect(await findHeaderButton('Cancel')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Confirm order' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark completed' })).not.toBeInTheDocument();
    expect(getItemsCard().getByRole('button', { name: 'Change' })).toBeVisible();
  });

  it('keeps Mark completed disabled while the parcel is in transit, with no cancel', async () => {
    respondWithOrder(buildDispatchedOrder('in_transit'));
    customRenderAtRoute({ url: '/orders/12' });

    expect(await findHeaderButton('Mark completed')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(getItemsCard().queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
  });

  it('completes a dispatched order once the delivery is delivered', async () => {
    const user = userEvent.setup();
    respondWithOrder(buildDispatchedOrder('delivered'));
    let isCompleted = false;
    server.use(
      http.post(mockEndpoints.orderComplete, () => {
        isCompleted = true;
        return HttpResponse.json({
          data: {
            ...buildDispatchedOrder('delivered'),
            status: 'completed',
            completed_at: '2026-10-18T15:00:00+00:00',
          },
        });
      }),
    );
    customRenderAtRoute({ url: '/orders/12' });

    const completeButton = await findHeaderButton('Mark completed');
    expect(completeButton).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    await user.click(completeButton);

    const toast = await findToast('Order completed');
    expect(toast.getByText(REFERENCE)).toBeVisible();
    expect(isCompleted).toBe(true);
    expect(screen.queryByRole('button', { name: 'Mark completed' })).not.toBeInTheDocument();
  });

  it('shows a refused completion as an error toast', async () => {
    const user = userEvent.setup();
    const counter = respondWithOrder(buildDispatchedOrder('delivered'));
    server.use(
      http.post(mockEndpoints.orderComplete, () =>
        HttpResponse.json(
          {
            message: 'Mark the delivery as delivered before completing the order.',
            code: 'delivery_not_delivered',
          },
          { status: 409 },
        ),
      ),
    );
    customRenderAtRoute({ url: '/orders/12' });

    await user.click(await findHeaderButton('Mark completed'));

    expect(
      await screen.findByText('Mark the delivery as delivered before completing the order.'),
    ).toBeVisible();
    await waitFor(() => {
      expect(counter.gets).toBe(2);
    });
  });

  it('offers cancel on a dispatched order whose delivery failed', async () => {
    respondWithOrder(buildDispatchedOrder('failed'));
    customRenderAtRoute({ url: '/orders/12' });

    expect(await findHeaderButton('Cancel')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Mark completed' })).toBeDisabled();
  });

  it('shows no actions on a completed order', async () => {
    respondWithOrder({
      ...buildDispatchedOrder('delivered'),
      status: 'completed',
      completed_at: '2026-10-18T15:00:00+00:00',
    });
    customRenderAtRoute({ url: '/orders/12' });

    await screen.findByRole('heading', { name: `Order ${REFERENCE}` });
    for (const name of ['Cancel', 'Confirm order', 'Mark completed', 'Change', 'Set fee']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('shows no actions or fee button without orders.manage', async () => {
    respondWithOrder(
      buildPendingOrder({
        delivery_fee_pending: true,
        delivery_charge: { zone_name: null, fee: null, source: null, pending_quote: true },
      }),
      buildUserWithoutOrdersManage(),
    );
    customRenderAtRoute({ url: '/orders/12' });

    await screen.findByRole('heading', { name: `Order ${REFERENCE}` });
    expect(screen.getByText('Pending quote')).toBeVisible();
    for (const name of ['Cancel', 'Confirm order', 'Mark completed', 'Change', 'Set fee']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });
});
