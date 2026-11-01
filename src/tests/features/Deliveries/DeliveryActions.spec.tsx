import { act, screen, waitFor, within } from '@testing-library/react';
import { focusManager } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';

import { type Delivery, type Order } from '@/types/sales';
import { customRenderAtRoute } from '@/tests/customRender';
import {
  buildCourierFixture,
  buildDeliveryFixture,
  buildOrderDeliveryFixture,
  buildOrderFixture,
} from '@/tests/fixtures/sales';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

const ORDER_REFERENCE = 'ZN7K-Q4M2-X9TD';

function buildUserWithoutOrdersManage() {
  const user = buildUserFixture();
  return buildUserFixture({
    memberships: user.memberships.map((membership) => ({
      ...membership,
      permissions: membership.permissions.filter((slug) => slug !== 'orders.manage'),
    })),
  });
}

function buildDelivery(overrides: Partial<Delivery> = {}) {
  return buildDeliveryFixture({
    id: 7,
    order_id: 12,
    status: 'dispatched',
    status_label: 'Dispatched',
    tracking_number: 'KE88213',
    dispatched_at: '2026-10-18T10:00:00+00:00',
    ...overrides,
  });
}

function buildOrder(overrides: Partial<Order> = {}) {
  return buildOrderFixture({
    id: 12,
    status: 'dispatched',
    hold_expires_at: null,
    delivery: buildOrderDeliveryFixture({ id: 7, status: 'dispatched' }),
    ...overrides,
  });
}

// Serves the delivery (one response per GET, the last one repeating) and counts the GETs.
function respondWith(
  deliveries: Delivery | Delivery[],
  {
    order = buildOrder(),
    user = buildUserFixture(),
  }: { order?: Order; user?: ReturnType<typeof buildUserFixture> } = {},
) {
  const responses = Array.isArray(deliveries) ? deliveries : [deliveries];
  const counter = { gets: 0 };
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.delivery, () => {
      const delivery = responses[Math.min(counter.gets, responses.length - 1)];
      counter.gets += 1;
      return HttpResponse.json({ data: delivery });
    }),
    http.get(mockEndpoints.order, () => HttpResponse.json({ data: order })),
    http.get(mockEndpoints.couriers, () =>
      HttpResponse.json({
        data: [
          buildCourierFixture({ id: 1, name: 'Swift Riders' }),
          buildCourierFixture({ id: 2, name: 'Boda Express' }),
          buildCourierFixture({ id: 3, name: 'Old Wheels', is_active: false }),
        ],
      }),
    ),
  );
  return counter;
}

async function findHeading() {
  return screen.findByRole('heading', { name: `Delivery ${ORDER_REFERENCE}` });
}

function getMain() {
  return within(screen.getByRole('main'));
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

describe('Delivery actions', () => {
  afterEach(() => {
    focusManager.setFocused(undefined);
  });

  it('keeps an action result when a reload started before it lands later', async () => {
    const user = userEvent.setup();
    respondWith(buildDelivery());
    const reload = { isSlow: false, hasLanded: false };
    server.use(
      http.get(mockEndpoints.delivery, async () => {
        if (!reload.isSlow) return HttpResponse.json({ data: buildDelivery() });
        await delay(300);
        reload.hasLanded = true;
        return HttpResponse.json({ data: buildDelivery() });
      }),
      http.post(mockEndpoints.deliveryInTransit, () =>
        HttpResponse.json({
          data: buildDelivery({ status: 'in_transit', status_label: 'In transit' }),
        }),
      ),
    );
    customRenderAtRoute({ url: '/deliveries/7' });
    await findHeading();

    reload.isSlow = true;
    act(() => focusManager.setFocused(false));
    act(() => focusManager.setFocused(true));
    await user.click(getMain().getByRole('button', { name: 'Mark in transit' }));
    await findToast('Marked in transit');
    await waitFor(() => expect(reload.hasLanded).toBe(true));
    await delay(50);

    expect(getMain().queryByRole('button', { name: 'Mark in transit' })).not.toBeInTheDocument();
  });

  it('offers in transit, failed and delivered on a dispatched courier delivery', async () => {
    const user = userEvent.setup();
    respondWith(buildDelivery());
    let isCalled = false;
    server.use(
      http.post(mockEndpoints.deliveryInTransit, () => {
        isCalled = true;
        return HttpResponse.json({
          data: buildDelivery({ status: 'in_transit', status_label: 'In transit' }),
        });
      }),
    );
    customRenderAtRoute({ url: '/deliveries/7' });

    await findHeading();
    expect(getMain().getByRole('button', { name: 'Mark failed' })).toBeVisible();
    expect(getMain().getByRole('button', { name: 'Mark delivered' })).toBeVisible();
    await user.click(getMain().getByRole('button', { name: 'Mark in transit' }));

    const toast = await findToast('Marked in transit');
    expect(toast.getByText(ORDER_REFERENCE)).toBeVisible();
    expect(isCalled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Mark in transit' })).not.toBeInTheDocument();
  });

  it('marks a courier delivery delivered', async () => {
    const user = userEvent.setup();
    respondWith(buildDelivery({ status: 'in_transit', status_label: 'In transit' }));
    server.use(
      http.post(mockEndpoints.deliveryDelivered, () =>
        HttpResponse.json({
          data: buildDelivery({
            status: 'delivered',
            status_label: 'Delivered',
            delivered_at: '2026-10-18T12:00:00+00:00',
          }),
        }),
      ),
    );
    customRenderAtRoute({ url: '/deliveries/7' });

    await findHeading();
    expect(screen.queryByRole('button', { name: 'Mark in transit' })).not.toBeInTheDocument();
    await user.click(getMain().getByRole('button', { name: 'Mark delivered' }));

    expect(await findToast('Marked delivered')).toBeDefined();
  });

  it('offers collection actions on a dispatched pickup', async () => {
    const user = userEvent.setup();
    const pickup = {
      method: 'pickup' as const,
      courier_id: null,
      courier_name: null,
      tracking_number: null,
    };
    respondWith(buildDelivery(pickup));
    server.use(
      http.post(mockEndpoints.deliveryDelivered, () =>
        HttpResponse.json({
          data: buildDelivery({ ...pickup, status: 'delivered', status_label: 'Collected' }),
        }),
      ),
    );
    customRenderAtRoute({ url: '/deliveries/7' });

    await findHeading();
    expect(screen.queryByRole('button', { name: 'Mark in transit' })).not.toBeInTheDocument();
    expect(getMain().getByRole('button', { name: 'Not collected' })).toBeVisible();
    await user.click(getMain().getByRole('button', { name: 'Mark collected' }));

    expect(await findToast('Marked collected')).toBeDefined();
  });

  it('shows a refused move as an error toast and reloads the delivery', async () => {
    const user = userEvent.setup();
    const counter = respondWith([
      buildDelivery(),
      buildDelivery({ status: 'failed', status_label: 'Failed', failure_reason: 'Gate locked' }),
    ]);
    server.use(
      http.post(mockEndpoints.deliveryInTransit, () =>
        HttpResponse.json(
          {
            message: "This delivery is failed and can't be moved that way.",
            code: 'invalid_transition',
            status: 'failed',
          },
          { status: 409 },
        ),
      ),
    );
    customRenderAtRoute({ url: '/deliveries/7' });

    await findHeading();
    await user.click(getMain().getByRole('button', { name: 'Mark in transit' }));

    expect(await findToast("This delivery is failed and can't be moved that way.")).toBeDefined();
    expect(await getMain().findByRole('button', { name: 'Retry delivery' })).toBeVisible();
    expect(counter.gets).toBe(2);
  });

  it('marks a delivery failed with a reason', async () => {
    const user = userEvent.setup();
    respondWith(buildDelivery());
    let sentBody: unknown = null;
    server.use(
      http.post(mockEndpoints.deliveryFailed, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({
          data: buildDelivery({
            status: 'failed',
            status_label: 'Failed',
            failure_reason: 'Buyer not reachable on phone',
          }),
        });
      }),
    );
    customRenderAtRoute({ url: '/deliveries/7' });

    await findHeading();
    await user.click(getMain().getByRole('button', { name: 'Mark failed' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Mark delivery failed?' }));
    expect(
      dialog.getByText(
        'The reason shows on the timeline. You can retry or mark it returned afterwards.',
      ),
    ).toBeVisible();
    const submit = dialog.getByRole('button', { name: 'Mark failed' });
    expect(submit).toBeDisabled();
    await user.type(dialog.getByLabelText('Reason'), 'Buyer not reachable on phone');
    await user.click(submit);

    expect(await findToast('Marked failed')).toBeDefined();
    expect(sentBody).toEqual({ reason: 'Buyer not reachable on phone' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a refused failure inside the dialog', async () => {
    const user = userEvent.setup();
    respondWith(buildDelivery());
    server.use(
      http.post(mockEndpoints.deliveryFailed, () =>
        HttpResponse.json(
          { message: "This delivery is delivered and can't be moved that way." },
          { status: 409 },
        ),
      ),
    );
    customRenderAtRoute({ url: '/deliveries/7' });

    await findHeading();
    await user.click(getMain().getByRole('button', { name: 'Mark failed' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Mark delivery failed?' }));
    await user.type(dialog.getByLabelText('Reason'), 'Gate locked');
    await user.click(dialog.getByRole('button', { name: 'Mark failed' }));

    expect(
      await dialog.findByText("This delivery is delivered and can't be moved that way."),
    ).toBeVisible();
  });

  it('retries a failed delivery, sending only what changed', async () => {
    const user = userEvent.setup();
    respondWith(buildDelivery({ status: 'failed', status_label: 'Failed' }));
    let sentBody: unknown = null;
    server.use(
      http.post(mockEndpoints.deliveryRetry, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ data: buildDelivery({ tracking_number: 'KE99001' }) });
      }),
    );
    customRenderAtRoute({ url: '/deliveries/7' });

    await findHeading();
    await user.click(getMain().getByRole('button', { name: 'Retry delivery' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Retry delivery' }));
    const courier = await dialog.findByLabelText('Courier');
    expect(courier).toHaveValue('1');
    expect(within(courier).queryByRole('option', { name: 'Old Wheels' })).not.toBeInTheDocument();
    const trackingNumber = dialog.getByLabelText(/Tracking number/);
    expect(trackingNumber).toHaveValue('KE88213');
    await user.clear(trackingNumber);
    await user.type(trackingNumber, 'KE99001');
    await user.click(dialog.getByRole('button', { name: 'Retry' }));

    const toast = await findToast('Delivery retried');
    expect(toast.getByText(ORDER_REFERENCE)).toBeVisible();
    expect(sentBody).toEqual({ tracking_number: 'KE99001' });
  });

  it('retries with the current courier and tracking when nothing changed', async () => {
    const user = userEvent.setup();
    respondWith(buildDelivery({ status: 'failed', status_label: 'Failed' }));
    let sentBody: unknown = null;
    server.use(
      http.post(mockEndpoints.deliveryRetry, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ data: buildDelivery() });
      }),
    );
    customRenderAtRoute({ url: '/deliveries/7' });

    await findHeading();
    await user.click(getMain().getByRole('button', { name: 'Retry delivery' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Retry delivery' }));
    await dialog.findByLabelText('Courier');
    await user.selectOptions(dialog.getByLabelText('Courier'), '2');
    await user.selectOptions(dialog.getByLabelText('Courier'), '1');
    await user.click(dialog.getByRole('button', { name: 'Retry' }));

    expect(await findToast('Delivery retried')).toBeDefined();
    expect(sentBody).toEqual({});
  });

  it('marks a failed delivery returned after confirming', async () => {
    const user = userEvent.setup();
    respondWith(buildDelivery({ status: 'failed', status_label: 'Failed' }));
    let isCalled = false;
    server.use(
      http.post(mockEndpoints.deliveryReturned, () => {
        isCalled = true;
        return HttpResponse.json({
          data: buildDelivery({ status: 'returned', status_label: 'Returned' }),
        });
      }),
    );
    customRenderAtRoute({ url: '/deliveries/7' });

    await findHeading();
    await user.click(getMain().getByRole('button', { name: 'Mark returned' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Mark returned?' }));
    expect(
      dialog.getByText('Use this once the parcel is back at the store. This is final.'),
    ).toBeVisible();
    expect(isCalled).toBe(false);
    await user.click(dialog.getByRole('button', { name: 'Mark returned' }));

    const toast = await findToast('Marked returned');
    expect(toast.getByText(ORDER_REFERENCE)).toBeVisible();
    expect(isCalled).toBe(true);
  });

  it('adds a note to the timeline', async () => {
    const user = userEvent.setup();
    respondWith(buildDelivery());
    let sentBody: unknown = null;
    server.use(
      http.post(mockEndpoints.deliveryNotes, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ data: buildDelivery() }, { status: 201 });
      }),
    );
    customRenderAtRoute({ url: '/deliveries/7' });

    await findHeading();
    await user.click(getMain().getByRole('button', { name: 'Add note' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Add note' }));
    expect(
      dialog.getByText('Notes appear on the timeline for everyone on the team.'),
    ).toBeVisible();
    const submit = dialog.getByRole('button', { name: 'Add note' });
    expect(submit).toBeDisabled();
    await user.type(dialog.getByLabelText('Note'), 'Rider says gate was locked');
    await user.click(submit);

    const toast = await findToast('Note added');
    expect(toast.getByText(ORDER_REFERENCE)).toBeVisible();
    expect(sentBody).toEqual({ note: 'Rider says gate was locked' });
  });

  it('offers no note and no tracking edit on a delivered delivery', async () => {
    respondWith(buildDelivery({ status: 'delivered', status_label: 'Delivered' }), {
      order: buildOrder({ status: 'completed' }),
    });
    customRenderAtRoute({ url: '/deliveries/7' });

    await findHeading();
    await screen.findByRole('heading', { name: 'Timeline' });
    expect(screen.queryByRole('button', { name: 'Add note' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('edits tracking only while preparing or failed', async () => {
    respondWith(buildDelivery());
    customRenderAtRoute({ url: '/deliveries/7' });

    await findHeading();
    await screen.findByRole('heading', { name: 'Tracking' });
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('clears an emptied tracking number', async () => {
    const user = userEvent.setup();
    respondWith(buildDelivery({ status: 'preparing', status_label: 'Preparing' }), {
      order: buildOrder({ status: 'confirmed' }),
    });
    let sentBody: unknown = null;
    server.use(
      http.patch(mockEndpoints.deliveryTracking, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({
          data: buildDelivery({
            status: 'preparing',
            status_label: 'Preparing',
            tracking_number: null,
          }),
        });
      }),
    );
    customRenderAtRoute({ url: '/deliveries/7' });

    await findHeading();
    await user.click(getMain().getByRole('button', { name: 'Edit' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit tracking' }));
    expect(dialog.getByText('Leave a field empty to clear it.')).toBeVisible();
    expect(await dialog.findByLabelText('Courier')).toHaveValue('1');
    await user.clear(dialog.getByLabelText(/Tracking number/));
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    expect(await findToast('Tracking updated')).toBeDefined();
    expect(sentBody).toEqual({ tracking_number: null });
  });

  it('completes the order once the delivery is delivered', async () => {
    const user = userEvent.setup();
    respondWith(buildDelivery({ status: 'delivered', status_label: 'Delivered' }));
    let isCalled = false;
    server.use(
      http.post(mockEndpoints.orderComplete, () => {
        isCalled = true;
        return HttpResponse.json({
          data: buildOrder({ status: 'completed', completed_at: '2026-10-18T13:00:00+00:00' }),
        });
      }),
    );
    customRenderAtRoute({ url: '/deliveries/7' });

    expect(
      await screen.findByText('Delivered. Complete the order to close the sale.'),
    ).toBeVisible();
    await user.click(getMain().getByRole('button', { name: 'Complete order' }));

    expect(await findToast('Order completed')).toBeDefined();
    expect(isCalled).toBe(true);
    await waitFor(() => {
      expect(
        screen.queryByText('Delivered. Complete the order to close the sale.'),
      ).not.toBeInTheDocument();
    });
  });

  it('shows no actions on a failed delivery without orders.manage', async () => {
    respondWith(buildDelivery({ status: 'failed', status_label: 'Failed' }), {
      user: buildUserWithoutOrdersManage(),
    });
    customRenderAtRoute({ url: '/deliveries/7' });

    await findHeading();
    await screen.findByRole('heading', { name: 'Tracking' });
    for (const name of ['Retry delivery', 'Mark returned', 'Add note', 'Edit']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('shows no move buttons or complete-order card without orders.manage', async () => {
    respondWith(buildDelivery({ status: 'delivered', status_label: 'Delivered' }), {
      user: buildUserWithoutOrdersManage(),
    });
    customRenderAtRoute({ url: '/deliveries/7' });

    await findHeading();
    // The order has loaded once its buyer shows.
    expect(await screen.findByText('Achieng Otieno')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Complete order' })).not.toBeInTheDocument();
    expect(
      screen.queryByText('Delivered. Complete the order to close the sale.'),
    ).not.toBeInTheDocument();
  });

  it('shows no move buttons on a dispatched delivery without orders.manage', async () => {
    respondWith(buildDelivery(), { user: buildUserWithoutOrdersManage() });
    customRenderAtRoute({ url: '/deliveries/7' });

    await findHeading();
    for (const name of ['Mark in transit', 'Mark failed', 'Mark delivered', 'Add note']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });
});
