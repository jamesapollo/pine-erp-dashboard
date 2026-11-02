import { act, screen, waitFor, within } from '@testing-library/react';
import { focusManager } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type OrderListItem } from '@/types/sales';
import { customRenderAtRoute } from '@/tests/customRender';
import { buildMoney, buildPaginated } from '@/tests/fixtures/catalogue';
import { buildOrderListItemFixture } from '@/tests/fixtures/sales';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';
import { formatDateTime } from '@/utils/movementTime';

function respondWithOrders(orders: OrderListItem[], totals: Partial<Record<string, number>> = {}) {
  const requests: URLSearchParams[] = [];
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })),
    http.get(mockEndpoints.orders, ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params);
      const total = totals[params.get('status') ?? 'all'] ?? orders.length;
      return HttpResponse.json(buildPaginated(orders, { total }));
    }),
  );
  return requests;
}

function listRequests(requests: URLSearchParams[]) {
  return requests.filter((params) => params.get('per_page') !== '1');
}

function buildUserWithoutOrdersView() {
  const user = buildUserFixture();
  return buildUserFixture({
    memberships: user.memberships.map((membership) => ({
      ...membership,
      permissions: membership.permissions.filter((slug) => slug !== 'orders.view'),
    })),
  });
}

describe('Orders list', () => {
  afterEach(() => {
    focusManager.setFocused(undefined);
  });

  it('loads the list and its counts again when the window regains focus', async () => {
    const requests = respondWithOrders([buildOrderListItemFixture()]);
    customRenderAtRoute({ url: '/orders' });
    await screen.findByRole('table');
    await waitFor(() => expect(requests).toHaveLength(8));

    act(() => focusManager.setFocused(false));
    act(() => focusManager.setFocused(true));

    // The list, the six tab counts and the sidebar's pending count each load once more.
    await waitFor(() => expect(requests).toHaveLength(16));
    expect(listRequests(requests)).toHaveLength(2);
  });

  it('lists orders with buyer, zone, quote, statuses and total', async () => {
    respondWithOrders([
      buildOrderListItemFixture({
        id: 12,
        status: 'confirmed',
        delivery_fee_pending: true,
        delivery_status: 'preparing',
        grand_total: buildMoney('4500.00'),
        hold_expires_at: null,
      }),
    ]);
    customRenderAtRoute({ url: '/orders' });

    expect(await screen.findByRole('heading', { name: 'Orders' })).toBeVisible();
    expect(
      screen.getByText('Storefront orders. Payment and delivery are arranged with the buyer.'),
    ).toBeVisible();
    const buyerLink = await screen.findByRole('link', { name: 'Achieng Otieno' });
    expect(buyerLink).toHaveAttribute('href', '/orders/12');
    const scope = within(buyerLink.closest('tr') as HTMLElement);
    expect(scope.getByText('+254712345678')).toBeVisible();
    expect(scope.getByText('Nairobi CBD')).toBeVisible();
    expect(scope.getByText('Quote')).toBeVisible();
    expect(scope.getByText('Confirmed')).toBeVisible();
    expect(scope.getByText('Preparing')).toBeVisible();
    expect(scope.getByText('4,500.00')).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Total (KES)' })).toBeVisible();
  });

  it('shows a dash for an order with no zone and no delivery', async () => {
    respondWithOrders([
      buildOrderListItemFixture({ zone_name: null, delivery_status: null, hold_expires_at: null }),
    ]);
    customRenderAtRoute({ url: '/orders' });

    const buyerLink = await screen.findByRole('link', { name: 'Achieng Otieno' });
    const scope = within(buyerLink.closest('tr') as HTMLElement);
    expect(scope.getAllByText('—')).toHaveLength(2);
    expect(scope.queryByText('Quote')).not.toBeInTheDocument();
  });

  it('opens the order when its buyer link is clicked', async () => {
    respondWithOrders([buildOrderListItemFixture({ id: 12 })]);
    const { router } = customRenderAtRoute({ url: '/orders' });

    await userEvent.click(await screen.findByRole('link', { name: 'Achieng Otieno' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/orders/12'));
  });

  it('shows tab counts from the list totals', async () => {
    respondWithOrders([buildOrderListItemFixture()], {
      all: 40,
      pending: 3,
      confirmed: 5,
      dispatched: 2,
      completed: 28,
      cancelled: 2,
    });
    customRenderAtRoute({ url: '/orders' });

    const pendingTab = await screen.findByRole('tab', { name: /Pending/ });
    await waitFor(() => expect(pendingTab).toHaveTextContent('Pending3'));
    expect(screen.getByRole('tab', { name: /All/ })).toHaveTextContent('40');
    expect(screen.getByRole('tab', { name: /Completed/ })).toHaveTextContent('28');
  });

  it('filters by status', async () => {
    const requests = respondWithOrders([buildOrderListItemFixture()]);
    const { router } = customRenderAtRoute({ url: '/orders' });

    await userEvent.click(await screen.findByRole('tab', { name: /Pending/ }));

    await waitFor(() =>
      expect(listRequests(requests).some((params) => params.get('status') === 'pending')).toBe(
        true,
      ),
    );
    expect(router.state.location.search).toBe('?status=pending');
  });

  it('searches by reference or phone after typing stops', async () => {
    const requests = respondWithOrders([buildOrderListItemFixture()]);
    const { router } = customRenderAtRoute({ url: '/orders' });

    await screen.findByRole('link', { name: 'Achieng Otieno' });
    const search = screen.getByRole('textbox', { name: 'Search orders' });
    expect(search).toHaveAttribute('placeholder', 'Reference or phone');
    await userEvent.type(search, '0712');

    await waitFor(() =>
      expect(listRequests(requests).filter((params) => params.get('q') === '0712')).toHaveLength(1),
    );
    expect(router.state.location.search).toBe('?q=0712');
  });

  it('filters to orders whose delivery fee is pending', async () => {
    const requests = respondWithOrders([buildOrderListItemFixture()]);
    const { router } = customRenderAtRoute({ url: '/orders' });

    const chip = await screen.findByRole('button', { name: 'Fee pending' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);

    await waitFor(() =>
      expect(
        listRequests(requests).some((params) => params.get('delivery_fee') === 'pending'),
      ).toBe(true),
    );
    expect(router.state.location.search).toBe('?fee=pending');
    expect(screen.getByRole('button', { name: 'Fee pending' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('warns when a pending order hold ends within six hours', async () => {
    const holdExpiresAt = new Date(Date.now() + 2 * 3_600_000).toISOString();
    respondWithOrders([
      buildOrderListItemFixture({ id: 1, status: 'pending', hold_expires_at: holdExpiresAt }),
      buildOrderListItemFixture({
        id: 2,
        buyer_name: 'Brian Mwangi',
        status: 'pending',
        hold_expires_at: new Date(Date.now() + 20 * 3_600_000).toISOString(),
      }),
    ]);
    customRenderAtRoute({ url: '/orders' });

    const soonRow = (await screen.findByRole('link', { name: 'Achieng Otieno' })).closest('tr');
    expect(
      within(soonRow as HTMLElement).getByText(`Hold ends ${formatDateTime(holdExpiresAt)}`),
    ).toBeVisible();
    const laterRow = screen.getByRole('link', { name: 'Brian Mwangi' }).closest('tr');
    expect(within(laterRow as HTMLElement).queryByText(/Hold ends/)).not.toBeInTheDocument();
  });

  it('shows the no-orders-yet message on the unfiltered list', async () => {
    respondWithOrders([]);
    customRenderAtRoute({ url: '/orders' });

    expect(
      await screen.findByText("No orders yet. They'll appear here when buyers check out."),
    ).toBeVisible();
  });

  it('shows the empty view message on a filtered list', async () => {
    respondWithOrders([]);
    customRenderAtRoute({ url: '/orders?status=cancelled' });

    expect(await screen.findByText('No orders in this view.')).toBeVisible();
  });

  it('pages through orders', async () => {
    const requests = respondWithOrders([buildOrderListItemFixture()], { all: 30 });
    server.use(
      http.get(mockEndpoints.orders, ({ request }) => {
        const params = new URL(request.url).searchParams;
        requests.push(params);
        return HttpResponse.json(
          buildPaginated([buildOrderListItemFixture()], {
            total: 30,
            last_page: 2,
            current_page: Number(params.get('page') ?? 1),
          }),
        );
      }),
    );
    const { router } = customRenderAtRoute({ url: '/orders' });

    expect(await screen.findByText('Showing 1–25 of 30')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(router.state.location.search).toBe('?page=2'));
    expect(await screen.findByText('Showing 26–30 of 30')).toBeVisible();
  });

  it('moves to the last page when the page number is past the end', async () => {
    server.use(
      http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })),
      http.get(mockEndpoints.orders, ({ request }) => {
        const params = new URL(request.url).searchParams;
        const isPastEnd = Number(params.get('page') ?? 1) > 2;
        return HttpResponse.json(
          buildPaginated(isPastEnd ? [] : [buildOrderListItemFixture()], {
            total: 30,
            last_page: 2,
            current_page: Number(params.get('page') ?? 1),
          }),
        );
      }),
    );
    const { router } = customRenderAtRoute({ url: '/orders?page=9' });

    await waitFor(() => expect(router.state.location.search).toBe('?page=2'));
    expect(await screen.findByRole('link', { name: 'Achieng Otieno' })).toBeVisible();
    expect(screen.queryByText(/No orders yet/)).not.toBeInTheDocument();
  });

  it('shows the empty message for an empty page that is not past the end', async () => {
    server.use(
      http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })),
      http.get(mockEndpoints.orders, () =>
        HttpResponse.json(buildPaginated([], { total: 30, last_page: 2, current_page: 2 })),
      ),
    );
    const { router } = customRenderAtRoute({ url: '/orders?page=2' });

    expect(await screen.findByText(/No orders yet/)).toBeVisible();
    expect(screen.queryByRole('status', { name: 'Loading orders' })).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('?page=2');
  });

  it('keeps the filters and offers a retry when the list fails', async () => {
    respondWithOrders([buildOrderListItemFixture()]);
    let shouldFail = true;
    server.use(
      http.get(mockEndpoints.orders, ({ request }) => {
        if (shouldFail && new URL(request.url).searchParams.get('per_page') !== '1') {
          return HttpResponse.json({ message: 'Boom' }, { status: 500 });
        }
        return HttpResponse.json(buildPaginated([buildOrderListItemFixture()]));
      }),
    );
    customRenderAtRoute({ url: '/orders' });

    expect(await screen.findByText("Couldn't load orders. Try again.")).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Search orders' })).toBeVisible();
    expect(screen.getByRole('tab', { name: /All/ })).toBeVisible();

    shouldFail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: 'Achieng Otieno' })).toBeVisible();
  });

  it('shows the Sales breadcrumb', async () => {
    respondWithOrders([buildOrderListItemFixture()]);
    customRenderAtRoute({ url: '/orders' });

    const breadcrumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Sales')).toBeVisible();
    expect(within(breadcrumb).getByText('Orders')).toBeVisible();
  });
});

describe('Sales navigation', () => {
  it('shows Sales with Orders, the pending count and Deliveries', async () => {
    respondWithOrders([buildOrderListItemFixture()], { pending: 3 });
    const { router } = customRenderAtRoute({ url: '/' });

    const navigation = await screen.findByRole('navigation', { name: 'Main' });
    expect(within(navigation).getByText('Sales')).toBeVisible();
    const ordersLink = within(navigation).getByRole('link', { name: /^Orders/ });
    await waitFor(() => expect(ordersLink).toHaveAccessibleName('Orders, 3 pending'));
    expect(within(ordersLink).getByText('3')).toBeVisible();
    expect(within(navigation).getByRole('link', { name: 'Deliveries' })).toHaveAttribute(
      'href',
      '/deliveries',
    );

    await userEvent.click(ordersLink);
    await waitFor(() => expect(router.state.location.pathname).toBe('/orders'));
  });

  it('shows no pending count when nothing is pending', async () => {
    respondWithOrders([], { pending: 0 });
    customRenderAtRoute({ url: '/' });

    const navigation = await screen.findByRole('navigation', { name: 'Main' });
    expect(await within(navigation).findByRole('link', { name: 'Orders' })).toBeVisible();
  });

  it('places Sales between Overview and Catalogue', async () => {
    respondWithOrders([]);
    customRenderAtRoute({ url: '/' });

    const navigation = await screen.findByRole('navigation', { name: 'Main' });
    const labels = within(navigation)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(labels).toEqual([
      'Overview',
      'Orders',
      'Deliveries',
      'Products',
      'Stock',
      'Staff',
      'Roles',
      'Delivery zones',
    ]);
  });

  it('hides Sales without orders.view and shows no access on the URL', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserWithoutOrdersView() })),
      http.get(mockEndpoints.orders, ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return HttpResponse.json(buildPaginated([]));
      }),
    );
    customRenderAtRoute({ url: '/orders' });

    expect(await screen.findByText("You don't have access to orders.")).toBeVisible();
    const navigation = screen.getByRole('navigation', { name: 'Main' });
    expect(within(navigation).queryByText('Sales')).not.toBeInTheDocument();
    expect(within(navigation).queryByRole('link', { name: /Orders/ })).not.toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });
});
