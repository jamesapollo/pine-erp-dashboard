import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';

import { type Courier, type Order, type OrderDelivery } from '@/types/sales';
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

const REFERENCE = 'ZN7K-Q4M2-X9TD';

const COURIERS = [
  buildCourierFixture({ id: 1, name: 'Swift Riders' }),
  buildCourierFixture({ id: 2, name: 'G4S Courier' }),
  buildCourierFixture({ id: 3, name: 'Retired Riders', is_active: false }),
];

function buildConfirmedOrder(overrides: Partial<Order> = {}) {
  return buildOrderFixture({
    id: 12,
    status: 'confirmed',
    hold_expires_at: null,
    confirmed_at: '2026-10-18T09:00:00+00:00',
    ...overrides,
  });
}

function buildDispatchedOrder(delivery: Partial<OrderDelivery>) {
  return buildConfirmedOrder({
    status: 'dispatched',
    dispatched_at: '2026-10-18T10:00:00+00:00',
    delivery_status: 'dispatched',
    delivery: buildOrderDeliveryFixture({
      status: 'dispatched',
      status_label: 'Dispatched',
      dispatched_at: '2026-10-18T10:00:00+00:00',
      ...delivery,
    }),
  });
}

// Serves the order (the latest one set) and the store's couriers.
function respondWith(order: Order, couriers: Courier[] = COURIERS) {
  const state = { order };
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })),
    http.get(mockEndpoints.order, () => HttpResponse.json({ data: state.order })),
    http.get(mockEndpoints.couriers, () => HttpResponse.json({ data: couriers })),
  );
  return state;
}

async function openDispatchDialog() {
  const user = userEvent.setup();
  await screen.findByRole('heading', { name: `Order ${REFERENCE}` });
  await user.click(within(screen.getByRole('main')).getByRole('button', { name: 'Dispatch' }));
  const dialog = within(await screen.findByRole('dialog', { name: 'Dispatch order' }));
  return { user, dialog };
}

async function findToast(title: string) {
  return waitFor(() => {
    const toast = screen
      .getAllByRole('status')
      .find((candidate) => within(candidate).queryByText(title) !== null);
    expect(toast).toBeDefined();
    return within(toast as HTMLElement);
  });
}

function getDeliveryCard() {
  return within(
    screen.getByRole('heading', { name: 'Delivery' }).closest('section') as HTMLElement,
  );
}

describe('Dispatch order', () => {
  it('creates a courier delivery, then dispatches it', async () => {
    const state = respondWith(buildConfirmedOrder());
    const requests: string[] = [];
    let deliveryBody: unknown;
    server.use(
      http.post(mockEndpoints.orderDelivery, async ({ request }) => {
        requests.push('delivery');
        deliveryBody = await request.json();
        state.order = buildConfirmedOrder({
          delivery_status: 'preparing',
          delivery: buildOrderDeliveryFixture({
            courier_name: 'G4S Courier',
            tracking_number: 'KE88213',
          }),
        });
        return HttpResponse.json({ data: state.order }, { status: 201 });
      }),
      http.get(mockEndpoints.delivery, () =>
        HttpResponse.json({
          data: buildDeliveryFixture({ courier_id: 2, tracking_number: 'KE88213' }),
        }),
      ),
      http.post(mockEndpoints.orderDispatch, () => {
        requests.push('dispatch');
        state.order = buildDispatchedOrder({
          courier_name: 'G4S Courier',
          tracking_number: 'KE88213',
        });
        return HttpResponse.json({ data: state.order });
      }),
    );
    customRenderAtRoute({ url: '/orders/12' });

    const { user, dialog } = await openDispatchDialog();
    expect(dialog.getByText('Hand the parcel over, then dispatch it here.')).toBeVisible();
    expect(dialog.getByRole('radio', { name: 'Courier' })).toBeChecked();
    const courierSelect = await dialog.findByRole('combobox', { name: 'Courier' });
    expect(
      within(courierSelect)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Select a courier', 'Swift Riders', 'G4S Courier']);
    await user.selectOptions(courierSelect, '2');
    await user.type(dialog.getByRole('textbox', { name: 'Tracking number' }), 'KE88213');
    await user.click(dialog.getByRole('button', { name: 'Dispatch' }));

    const toast = await findToast('Order dispatched');
    expect(toast.getByText(REFERENCE)).toBeVisible();
    expect(requests).toEqual(['delivery', 'dispatch']);
    expect(deliveryBody).toEqual({ method: 'courier', courier_id: 2, tracking_number: 'KE88213' });
    expect(screen.queryByRole('dialog', { name: 'Dispatch order' })).not.toBeInTheDocument();
    expect(getDeliveryCard().getByText('G4S Courier')).toBeVisible();
  });

  it('asks for a courier before dispatching by courier', async () => {
    respondWith(buildConfirmedOrder());
    customRenderAtRoute({ url: '/orders/12' });

    const { user, dialog } = await openDispatchDialog();
    await dialog.findByRole('combobox', { name: 'Courier' });
    await user.click(dialog.getByRole('button', { name: 'Dispatch' }));

    expect(await dialog.findByRole('alert')).toHaveTextContent('Choose a courier');
  });

  it('dispatches a pickup without a courier', async () => {
    const state = respondWith(buildConfirmedOrder());
    let deliveryBody: unknown;
    server.use(
      http.post(mockEndpoints.orderDelivery, async ({ request }) => {
        deliveryBody = await request.json();
        state.order = buildConfirmedOrder({
          delivery_status: 'preparing',
          delivery: buildOrderDeliveryFixture({ method: 'pickup', courier_name: null }),
        });
        return HttpResponse.json({ data: state.order }, { status: 201 });
      }),
      http.post(mockEndpoints.orderDispatch, () => {
        state.order = buildDispatchedOrder({
          method: 'pickup',
          courier_name: null,
          status_label: 'Ready for collection',
        });
        return HttpResponse.json({ data: state.order });
      }),
    );
    customRenderAtRoute({ url: '/orders/12' });

    const { user, dialog } = await openDispatchDialog();
    await user.click(await dialog.findByRole('radio', { name: 'Pickup' }));

    expect(dialog.getByText('The buyer can collect it from the store.')).toBeVisible();
    expect(dialog.queryByRole('combobox', { name: 'Courier' })).not.toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Dispatch' }));

    await findToast('Order dispatched');
    expect(deliveryBody).toEqual({ method: 'pickup' });
    expect(getDeliveryCard().getByText('Ready for collection')).toBeVisible();
  });

  it('offers only pickup when no courier is active', async () => {
    respondWith(buildConfirmedOrder(), [buildCourierFixture({ is_active: false })]);
    customRenderAtRoute({ url: '/orders/12' });

    const { dialog } = await openDispatchDialog();

    expect(await dialog.findByRole('radio', { name: 'Courier' })).toBeDisabled();
    expect(dialog.getByRole('radio', { name: 'Pickup' })).toBeChecked();
    expect(
      dialog.getByText('No active couriers. Choose pickup, or ask an owner to add a courier.'),
    ).toBeVisible();
  });

  it('waits for the delivery fee', async () => {
    respondWith(
      buildConfirmedOrder({
        delivery_fee_pending: true,
        delivery_charge: { zone_name: null, fee: null, source: null, pending_quote: true },
      }),
    );
    customRenderAtRoute({ url: '/orders/12' });

    const { dialog } = await openDispatchDialog();

    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'Set the delivery fee before dispatch.',
    );
    expect(dialog.getByRole('button', { name: 'Dispatch' })).toBeDisabled();
  });

  it('keeps the created delivery when dispatch fails, and only dispatches on retry', async () => {
    const state = respondWith(buildConfirmedOrder());
    const requests: string[] = [];
    let isCourierActive = false;
    server.use(
      http.post(mockEndpoints.orderDelivery, () => {
        requests.push('delivery');
        state.order = buildConfirmedOrder({
          delivery_status: 'preparing',
          delivery: buildOrderDeliveryFixture({ courier_name: 'G4S Courier' }),
        });
        return HttpResponse.json({ data: state.order }, { status: 201 });
      }),
      http.get(mockEndpoints.delivery, () =>
        HttpResponse.json({ data: buildDeliveryFixture({ courier_id: 2 }) }),
      ),
      http.post(mockEndpoints.orderDispatch, () => {
        requests.push('dispatch');
        if (!isCourierActive) {
          return HttpResponse.json(
            {
              message: 'Choose an active courier.',
              errors: { courier_id: ['Choose an active courier.'] },
            },
            { status: 422 },
          );
        }
        state.order = buildDispatchedOrder({ courier_name: 'G4S Courier' });
        return HttpResponse.json({ data: state.order });
      }),
    );
    customRenderAtRoute({ url: '/orders/12' });

    const { user, dialog } = await openDispatchDialog();
    await user.selectOptions(await dialog.findByRole('combobox', { name: 'Courier' }), '2');
    await user.click(dialog.getByRole('button', { name: 'Dispatch' }));

    expect(await dialog.findByText('Choose an active courier.')).toBeVisible();
    expect(getDeliveryCard().getByText('G4S Courier')).toBeVisible();
    expect(dialog.queryByRole('radio')).not.toBeInTheDocument();

    isCourierActive = true;
    await user.click(dialog.getByRole('button', { name: 'Dispatch' }));

    await findToast('Order dispatched');
    expect(requests).toEqual(['delivery', 'dispatch', 'dispatch']);
  });

  it('shows the existing delivery method as text and updates changed tracking first', async () => {
    const state = respondWith(
      buildConfirmedOrder({
        delivery_status: 'preparing',
        delivery: buildOrderDeliveryFixture({ id: 7, courier_name: 'Swift Riders' }),
      }),
    );
    const requests: string[] = [];
    let trackingBody: unknown;
    server.use(
      http.get(mockEndpoints.delivery, () =>
        HttpResponse.json({ data: buildDeliveryFixture({ id: 7, order_id: 12, courier_id: 1 }) }),
      ),
      http.patch(mockEndpoints.deliveryTracking, async ({ request }) => {
        requests.push('tracking');
        trackingBody = await request.json();
        return HttpResponse.json({
          data: buildDeliveryFixture({
            id: 7,
            order_id: 12,
            courier_id: 2,
            courier_name: 'G4S Courier',
            tracking_number: 'KE88213',
          }),
        });
      }),
      http.post(mockEndpoints.orderDelivery, () => {
        requests.push('delivery');
        return HttpResponse.json({}, { status: 500 });
      }),
      http.post(mockEndpoints.orderDispatch, () => {
        requests.push('dispatch');
        state.order = buildDispatchedOrder({ id: 7, courier_name: 'G4S Courier' });
        return HttpResponse.json({ data: state.order });
      }),
    );
    customRenderAtRoute({ url: '/orders/12' });

    const { user, dialog } = await openDispatchDialog();
    const courierSelect = await dialog.findByRole('combobox', { name: 'Courier' });

    expect(dialog.queryByRole('radio')).not.toBeInTheDocument();
    expect(dialog.getByText('Method')).toBeVisible();
    expect(courierSelect).toHaveValue('1');
    await user.selectOptions(courierSelect, '2');
    await user.type(dialog.getByRole('textbox', { name: 'Tracking number' }), 'KE88213');
    await user.click(dialog.getByRole('button', { name: 'Dispatch' }));

    await findToast('Order dispatched');
    expect(requests).toEqual(['tracking', 'dispatch']);
    expect(trackingBody).toEqual({ courier_id: 2, tracking_number: 'KE88213' });
  });

  it('keeps the dispatched order when an order reload from the tracking edit lands later', async () => {
    const state = respondWith(
      buildConfirmedOrder({
        delivery_status: 'preparing',
        delivery: buildOrderDeliveryFixture({ id: 7, courier_name: 'Swift Riders' }),
      }),
    );
    const reload = { isSlow: false, hasLanded: false };
    server.use(
      // Once tracking is saved, the order reload answers with the order as it was when asked,
      // and only after the dispatch has come back.
      http.get(mockEndpoints.order, async () => {
        const order = state.order;
        if (!reload.isSlow) return HttpResponse.json({ data: order });
        await delay(300);
        reload.hasLanded = true;
        return HttpResponse.json({ data: order });
      }),
      http.get(mockEndpoints.delivery, () =>
        HttpResponse.json({ data: buildDeliveryFixture({ id: 7, order_id: 12, courier_id: 1 }) }),
      ),
      http.patch(mockEndpoints.deliveryTracking, () => {
        reload.isSlow = true;
        return HttpResponse.json({
          data: buildDeliveryFixture({ id: 7, order_id: 12, courier_id: 2 }),
        });
      }),
      http.post(mockEndpoints.orderDispatch, () => {
        state.order = buildDispatchedOrder({ id: 7, courier_name: 'G4S Courier' });
        return HttpResponse.json({ data: state.order });
      }),
    );
    customRenderAtRoute({ url: '/orders/12' });

    const { user, dialog } = await openDispatchDialog();
    await user.selectOptions(await dialog.findByRole('combobox', { name: 'Courier' }), '2');
    await user.click(dialog.getByRole('button', { name: 'Dispatch' }));
    await findToast('Order dispatched');
    await waitFor(() => expect(reload.hasLanded).toBe(true));
    await delay(50);

    const progress = within(screen.getByRole('group', { name: 'Order progress' }));
    expect(
      progress.getByText('Dispatched').closest('[data-state]')?.getAttribute('data-state'),
    ).toBe('current');
  });

  it('dispatches an existing delivery straight away when nothing changed', async () => {
    const state = respondWith(
      buildConfirmedOrder({
        delivery_status: 'preparing',
        delivery: buildOrderDeliveryFixture({ id: 7 }),
      }),
    );
    const requests: string[] = [];
    server.use(
      http.get(mockEndpoints.delivery, () =>
        HttpResponse.json({ data: buildDeliveryFixture({ id: 7, order_id: 12, courier_id: 1 }) }),
      ),
      http.post(mockEndpoints.orderDispatch, () => {
        requests.push('dispatch');
        state.order = buildDispatchedOrder({ id: 7 });
        return HttpResponse.json({ data: state.order });
      }),
    );
    customRenderAtRoute({ url: '/orders/12' });

    const { user, dialog } = await openDispatchDialog();
    expect(await dialog.findByRole('combobox', { name: 'Courier' })).toHaveValue('1');
    await user.click(dialog.getByRole('button', { name: 'Dispatch' }));

    await findToast('Order dispatched');
    expect(requests).toEqual(['dispatch']);
  });

  it('closes without a request on "Not yet"', async () => {
    respondWith(buildConfirmedOrder());
    customRenderAtRoute({ url: '/orders/12' });

    const { user, dialog } = await openDispatchDialog();
    await user.click(dialog.getByRole('button', { name: 'Not yet' }));

    expect(screen.queryByRole('dialog', { name: 'Dispatch order' })).not.toBeInTheDocument();
  });
});
