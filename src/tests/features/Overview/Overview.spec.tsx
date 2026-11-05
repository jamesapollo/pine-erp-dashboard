import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { customRenderAtRoute } from '@/tests/customRender';
import { buildPaginated, buildVariantStockLevelFixture } from '@/tests/fixtures/catalogue';
import { buildOrderListItemFixture } from '@/tests/fixtures/sales';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

const GREETING = /^Good (morning|afternoon|evening), Wanjiru$/;

const ORDER_TOTALS: Record<string, number> = { pending: 6, confirmed: 2 };
const DELIVERY_TOTALS: Record<string, number> = { dispatched: 3, in_transit: 4, failed: 2 };

const pendingOrders = [
  buildOrderListItemFixture({ id: 11, buyer_name: 'Achieng Otieno', zone_name: 'Nairobi CBD' }),
  buildOrderListItemFixture({
    id: 12,
    buyer_name: 'Brian Mwangi',
    zone_name: null,
    country: 'UG',
  }),
];

const lowStock = [
  buildVariantStockLevelFixture({
    variant_id: 21,
    product_title: 'Ankara wrap dress',
    stock: { on_hand: 2, reserved: 0, available: 2 },
  }),
  buildVariantStockLevelFixture({
    variant_id: 22,
    product_title: 'Kitenge shirt',
    is_default: true,
    sku: 'KS-01',
    option_values: [],
    stock: { on_hand: 1, reserved: 1, available: 0 },
  }),
];

function stockList(data: typeof lowStock, total: number) {
  return { ...buildPaginated(data, { total }), totals: { on_hand: 0, reserved: 0 } };
}

function respondWithOverview({
  permissions,
  pendingTotal = ORDER_TOTALS.pending,
}: { permissions?: string[]; pendingTotal?: number } = {}) {
  const user = buildUserFixture();
  const stockRequests: URLSearchParams[] = [];
  server.use(
    http.get(mockEndpoints.me, () =>
      HttpResponse.json({
        data: permissions
          ? buildUserFixture({
              memberships: user.memberships.map((membership) => ({ ...membership, permissions })),
            })
          : user,
      }),
    ),
    http.get(mockEndpoints.orders, ({ request }) => {
      const params = new URL(request.url).searchParams;
      const status = params.get('status') ?? '';
      const total = status === 'pending' ? pendingTotal : (ORDER_TOTALS[status] ?? 0);
      const rows = params.get('per_page') === '1' ? [] : pendingOrders;
      return HttpResponse.json(buildPaginated(rows, { total }));
    }),
    http.get(mockEndpoints.deliveries, ({ request }) => {
      const status = new URL(request.url).searchParams.get('status') ?? '';
      return HttpResponse.json(buildPaginated([], { total: DELIVERY_TOTALS[status] ?? 0 }));
    }),
    http.get(mockEndpoints.stockLevels, ({ request }) => {
      const params = new URL(request.url).searchParams;
      stockRequests.push(params);
      if (params.get('per_page') !== '1') return HttpResponse.json(stockList(lowStock, 2));
      if (params.get('available_max') === '0') return HttpResponse.json(stockList([], 1));
      if (params.get('available_min') === '1') return HttpResponse.json(stockList([], 4));
      return HttpResponse.json(stockList([], 40));
    }),
  );
  return { stockRequests };
}

function getStat(label: string) {
  const summary = screen.getByRole('region', { name: 'Summary' });
  return within(summary).getByText(label).parentElement as HTMLElement;
}

describe('Overview', () => {
  it('greets the user and counts the orders, deliveries and stock to act on', async () => {
    respondWithOverview();
    customRenderAtRoute({ url: '/' });

    expect(await screen.findByRole('heading', { level: 1, name: GREETING })).toBeVisible();
    expect(await screen.findByText('6 orders are waiting for you to confirm.')).toBeVisible();

    await waitFor(() => expect(getStat('Out for delivery')).toHaveTextContent('7'));
    expect(getStat('Awaiting confirmation')).toHaveTextContent('6');
    expect(getStat('Ready to dispatch')).toHaveTextContent('2');
    expect(getStat('Out for delivery')).toHaveTextContent('2 failed, need attention');
    await waitFor(() => expect(getStat('Low stock')).toHaveTextContent('5'));
    expect(getStat('Low stock')).toHaveTextContent('1 out of stock');
  });

  it('says when no orders are waiting', async () => {
    respondWithOverview({ pendingTotal: 0 });
    customRenderAtRoute({ url: '/' });

    expect(await screen.findByText('No orders are waiting for you to confirm.')).toBeVisible();
  });

  it('lists the orders that need confirming and opens one', async () => {
    respondWithOverview({ pendingTotal: 12 });
    const { router } = customRenderAtRoute({ url: '/' });

    const table = await screen.findByRole('table', { name: 'Orders waiting for confirmation' });
    expect(await within(table).findByText('Achieng Otieno')).toBeVisible();
    expect(within(table).getByText('Nairobi CBD')).toBeVisible();
    expect(within(table).getByText('Uganda')).toBeVisible();
    expect(screen.getByText('Showing 8 of 12')).toBeVisible();
    expect(screen.getByRole('link', { name: 'All orders' })).toHaveAttribute(
      'href',
      '/orders?status=pending',
    );

    await userEvent.click(within(table).getByText('Brian Mwangi'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/orders/12'));
  });

  it('lists variants with three or fewer left, out of stock included', async () => {
    const { stockRequests } = respondWithOverview();
    customRenderAtRoute({ url: '/' });

    const list = await screen.findByRole('list', { name: 'Low stock variants' });
    const dress = within(list).getByRole('link', { name: /Ankara wrap dress/ });
    expect(dress).toHaveTextContent('M · Indigo');
    expect(dress).toHaveTextContent('2 left');
    expect(dress).toHaveAttribute('href', '/inventory/21');
    const shirt = within(list).getByRole('link', { name: /Kitenge shirt/ });
    expect(shirt).toHaveTextContent('KS-01');
    expect(shirt).toHaveTextContent('Out');

    const listRequest = stockRequests.find((params) => params.get('per_page') === '6');
    expect(listRequest?.get('available_max')).toBe('3');
    expect(listRequest?.has('available_min')).toBe(false);
  });

  it('shows empty states when nothing needs attention', async () => {
    respondWithOverview({ pendingTotal: 0 });
    server.use(
      http.get(mockEndpoints.orders, () => HttpResponse.json(buildPaginated([]))),
      http.get(mockEndpoints.stockLevels, () => HttpResponse.json(stockList([], 0))),
    );
    customRenderAtRoute({ url: '/' });

    expect(
      await screen.findByText('No orders waiting. New ones appear here when buyers check out.'),
    ).toBeVisible();
    expect(await screen.findByText('Nothing running low')).toBeVisible();
  });

  it('shows only stock to someone without orders.view', async () => {
    respondWithOverview({ permissions: ['store.view', 'inventory.view'] });
    customRenderAtRoute({ url: '/' });

    expect(await screen.findByRole('list', { name: 'Low stock variants' })).toBeVisible();
    expect(screen.queryByText('Awaiting confirmation')).not.toBeInTheDocument();
    expect(screen.queryByText('Needs confirming')).not.toBeInTheDocument();
    expect(screen.queryByText(/waiting for you to confirm/)).not.toBeInTheDocument();
  });

  it('shows only orders to someone without inventory.view', async () => {
    const { stockRequests } = respondWithOverview({ permissions: ['store.view', 'orders.view'] });
    customRenderAtRoute({ url: '/' });

    expect(
      await screen.findByRole('table', { name: 'Orders waiting for confirmation' }),
    ).toBeVisible();
    expect(screen.queryByText('Low stock')).not.toBeInTheDocument();
    expect(stockRequests).toHaveLength(0);
  });

  it('shows a placeholder to someone who can see neither', async () => {
    respondWithOverview({ permissions: ['store.view', 'catalogue.view'] });
    customRenderAtRoute({ url: '/' });

    expect(await screen.findByRole('heading', { level: 1, name: GREETING })).toBeVisible();
    expect(screen.getByText('Nothing here yet')).toBeVisible();
  });
});
