import { act, screen, waitFor, within } from '@testing-library/react';
import { focusManager } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';

import { type Delivery, type Order } from '@/types/sales';
import { customRenderAtRoute } from '@/tests/customRender';
import {
  buildDeliveryEventFixture,
  buildDeliveryFixture,
  buildOrderFixture,
} from '@/tests/fixtures/sales';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';
import { formatDateTime, formatMovementTime } from '@/utils/movementTime';

const ORDER_REFERENCE = 'ZN7K-Q4M2-X9TD';

function respondWith(delivery: Delivery, order: Order = buildDispatchedOrder()) {
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })),
    http.get(mockEndpoints.delivery, () => HttpResponse.json({ data: delivery })),
    http.get(mockEndpoints.order, () => HttpResponse.json({ data: order })),
  );
}

function buildDispatchedOrder(overrides: Partial<Order> = {}) {
  return buildOrderFixture({
    id: 12,
    status: 'dispatched',
    hold_expires_at: null,
    zone_name: 'Westlands',
    delivery_charge: {
      zone_name: 'Westlands',
      fee: null,
      source: 'zone',
      pending_quote: false,
    },
    ...overrides,
  });
}

function buildInTransitDelivery(overrides: Partial<Delivery> = {}) {
  return buildDeliveryFixture({
    id: 7,
    order_id: 12,
    status: 'in_transit',
    status_label: 'In transit',
    tracking_number: 'KE88213',
    tracking_url: 'https://track.swiftriders.test/KE88213',
    dispatched_at: '2026-10-18T10:00:00+00:00',
    updated_at: '2026-10-18T11:00:00+00:00',
    timeline: [
      buildDeliveryEventFixture({ id: 1, actor: { id: 2, name: 'Otieno O.' } }),
      buildDeliveryEventFixture({
        id: 2,
        from_status: 'preparing',
        to_status: 'dispatched',
        actor: { id: 2, name: 'Otieno O.' },
        created_at: '2026-10-18T10:00:00+00:00',
      }),
      buildDeliveryEventFixture({
        id: 3,
        from_status: 'dispatched',
        to_status: 'in_transit',
        actor: null,
        created_at: '2026-10-18T11:00:00+00:00',
      }),
    ],
    ...overrides,
  });
}

function getCard(name: string) {
  return within(screen.getByRole('heading', { name }).closest('section') as HTMLElement);
}

describe('Delivery detail', () => {
  afterEach(() => {
    focusManager.setFocused(undefined);
  });

  function countDeliveryRequests() {
    const counter = { requestCount: 0 };
    server.use(
      http.get(mockEndpoints.delivery, () => {
        counter.requestCount += 1;
        return HttpResponse.json({ data: buildInTransitDelivery() });
      }),
    );
    return counter;
  }

  it('loads the delivery again when the window regains focus', async () => {
    respondWith(buildInTransitDelivery());
    const counter = countDeliveryRequests();
    customRenderAtRoute({ url: '/deliveries/7' });
    await screen.findByRole('heading', { name: `Delivery ${ORDER_REFERENCE}` });
    expect(counter.requestCount).toBe(1);

    act(() => focusManager.setFocused(false));
    act(() => focusManager.setFocused(true));

    await waitFor(() => expect(counter.requestCount).toBe(2));
  });

  it('loads a cached delivery again when it is opened again', async () => {
    respondWith(buildInTransitDelivery());
    const counter = countDeliveryRequests();
    const { router } = customRenderAtRoute({ url: '/deliveries/7' });
    await screen.findByRole('heading', { name: `Delivery ${ORDER_REFERENCE}` });

    await act(() => router.navigate('/nowhere'));
    await screen.findByRole('heading', { name: 'Page not found' });
    await act(() => router.navigate('/deliveries/7'));

    await screen.findByRole('heading', { name: `Delivery ${ORDER_REFERENCE}` });
    await waitFor(() => expect(counter.requestCount).toBe(2));
  });

  it('shows the header with the order reference, method and last update', async () => {
    respondWith(buildInTransitDelivery());
    customRenderAtRoute({ url: '/deliveries/7' });

    expect(
      await screen.findByRole('heading', { name: `Delivery ${ORDER_REFERENCE}` }),
    ).toBeVisible();
    expect(
      screen.getByText(`Courier · last update ${formatMovementTime('2026-10-18T11:00:00+00:00')}`),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Copy reference' })).toBeVisible();
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: 'Deliveries' }),
    ).toHaveAttribute('href', '/deliveries');
  });

  it('shows the failure reason in a banner', async () => {
    respondWith(
      buildInTransitDelivery({
        status: 'failed',
        status_label: 'Failed',
        failure_reason: 'Buyer not reachable on phone',
      }),
    );
    customRenderAtRoute({ url: '/deliveries/7' });

    expect(await screen.findByText('Delivery failed', { selector: 'div' })).toBeVisible();
    expect(
      screen.getByText(
        'Buyer not reachable on phone. Retry with the same or a different courier, or mark it returned once the parcel is back.',
      ),
    ).toBeVisible();
  });

  it('points a preparing delivery to its order', async () => {
    respondWith(
      buildDeliveryFixture({ id: 7, order_id: 12 }),
      buildDispatchedOrder({ status: 'confirmed' }),
    );
    customRenderAtRoute({ url: '/deliveries/7' });

    expect(
      await screen.findByText(
        'Being packed. Dispatch it from the order page to choose a courier and start tracking.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Go to order' })).toHaveAttribute('href', '/orders/12');
  });

  it('shows the timeline newest first with who did what', async () => {
    respondWith(buildInTransitDelivery());
    customRenderAtRoute({ url: '/deliveries/7' });

    await screen.findByRole('heading', { name: 'Timeline' });
    const timeline = getCard('Timeline');
    expect(timeline.getByText('Newest first')).toBeVisible();
    const entries = within(timeline.getByRole('list')).getAllByRole('listitem');
    expect(entries).toHaveLength(3);
    expect(entries[0]).toHaveTextContent(/^In transit/);
    expect(within(entries[0]).getByText('Swift Riders · KE88213')).toBeVisible();
    expect(entries[1]).toHaveTextContent(/^Dispatched/);
    expect(within(entries[1]).getByText('by Otieno O. · Swift Riders')).toBeVisible();
    expect(entries[2]).toHaveTextContent(/^Delivery created/);
    expect(within(entries[2]).getByText('by Otieno O.')).toBeVisible();
  });

  it('shows the status and tracking with a link to the tracking page', async () => {
    respondWith(buildInTransitDelivery());
    customRenderAtRoute({ url: '/deliveries/7' });

    await screen.findByRole('heading', { name: 'Status' });
    const status = getCard('Status');
    expect(status.getByText('In transit')).toBeVisible();
    expect(status.getByText('Courier')).toBeVisible();
    expect(status.getByText(formatDateTime('2026-10-18T10:00:00+00:00'))).toBeVisible();

    const tracking = getCard('Tracking');
    expect(tracking.getByText('Swift Riders')).toBeVisible();
    expect(tracking.getByText('KE88213')).toBeVisible();
    const link = tracking.getByRole('link', { name: 'Open tracking page' });
    expect(link).toHaveAttribute('href', 'https://track.swiftriders.test/KE88213');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('leaves out the tracking link when it is not a web address', async () => {
    respondWith(buildInTransitDelivery({ tracking_url: 'javascript:alert(1)' }));
    customRenderAtRoute({ url: '/deliveries/7' });

    await screen.findByRole('heading', { name: 'Tracking' });
    expect(getCard('Tracking').getByText('KE88213')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Open tracking page' })).not.toBeInTheDocument();
  });

  it('shows when a delivery was delivered', async () => {
    respondWith(
      buildInTransitDelivery({
        status: 'delivered',
        status_label: 'Delivered',
        delivered_at: '2026-10-18T12:00:00+00:00',
      }),
    );
    customRenderAtRoute({ url: '/deliveries/7' });

    await screen.findByRole('heading', { name: 'Status' });
    const status = getCard('Status');
    expect(status.getByText('Delivered', { selector: 'dt' })).toBeVisible();
    expect(status.getByText(formatDateTime('2026-10-18T12:00:00+00:00'))).toBeVisible();
  });

  it('has no tracking card for a pickup', async () => {
    respondWith(
      buildInTransitDelivery({
        method: 'pickup',
        status: 'dispatched',
        status_label: 'Ready for collection',
        courier_id: null,
        courier_name: null,
        tracking_number: null,
        tracking_url: null,
      }),
    );
    customRenderAtRoute({ url: '/deliveries/7' });

    expect(await screen.findByText(/^Pickup · last update/)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Status' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Tracking' })).not.toBeInTheDocument();
  });

  it('shows the buyer and zone from the order and opens it', async () => {
    respondWith(buildInTransitDelivery());
    customRenderAtRoute({ url: '/deliveries/7' });

    await screen.findByRole('heading', { name: 'Order' });
    const order = getCard('Order');
    expect(order.getByText(ORDER_REFERENCE)).toBeVisible();
    expect(await order.findByText('Achieng Otieno')).toBeVisible();
    expect(order.getByText('Westlands')).toBeVisible();
    expect(order.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/orders/12');
  });

  it('shows the order reference as the last breadcrumb', async () => {
    respondWith(buildInTransitDelivery());
    customRenderAtRoute({ url: '/deliveries/7' });

    const breadcrumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(await within(breadcrumb).findByText(ORDER_REFERENCE)).toBeVisible();
    expect(within(breadcrumb).getByText('Sales')).toBeVisible();
    expect(within(breadcrumb).getByText('Deliveries')).toBeVisible();
  });

  it('shows Page not found for a non-numeric delivery id', async () => {
    respondWith(buildInTransitDelivery());
    customRenderAtRoute({ url: '/deliveries/abc' });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Page not found')).toBeVisible();
    expect(within(breadcrumb).queryByText('Deliveries')).not.toBeInTheDocument();
  });

  it('shows Page not found for a missing delivery', async () => {
    respondWith(buildInTransitDelivery());
    server.use(
      http.get(mockEndpoints.delivery, () =>
        HttpResponse.json({ message: 'Not found.' }, { status: 404 }),
      ),
    );
    customRenderAtRoute({ url: '/deliveries/99' });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});
