import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type Order } from '@/types/sales';
import { customRenderAtRoute } from '@/tests/customRender';
import { buildMoney } from '@/tests/fixtures/catalogue';
import {
  buildOrderDeliveryFixture,
  buildOrderFixture,
  buildOrderLineFixture,
} from '@/tests/fixtures/sales';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';
import { formatDateTime } from '@/utils/movementTime';

function respondWithOrder(order: Order) {
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })),
    http.get(mockEndpoints.order, () => HttpResponse.json({ data: order })),
  );
}

function buildConfirmedOrder(overrides: Partial<Order> = {}) {
  return buildOrderFixture({
    id: 12,
    status: 'confirmed',
    hold_expires_at: null,
    confirmed_at: '2026-10-18T09:00:00+00:00',
    lines: [
      buildOrderLineFixture({ quantity: 2, line_total: buildMoney('9000.00') }),
      buildOrderLineFixture({
        id: 2,
        product_name: 'Kitenge shirt',
        variant_label: 'Large',
        sku: 'KITENGE-SHIRT-L',
        unit_price_paid: buildMoney('2000.00'),
        line_total: buildMoney('2000.00'),
      }),
    ],
    subtotal: buildMoney('11000.00'),
    grand_total: buildMoney('11500.00'),
    ...overrides,
  });
}

async function findItemsCard() {
  const heading = await screen.findByRole('heading', { name: 'Items' });
  return within(heading.closest('section') as HTMLElement);
}

function getCard(name: string) {
  return within(screen.getByRole('heading', { name }).closest('section') as HTMLElement);
}

describe('Order detail', () => {
  it('shows the header, status and progress of a confirmed order', async () => {
    respondWithOrder(buildConfirmedOrder());
    customRenderAtRoute({ url: '/orders/12' });

    expect(await screen.findByRole('heading', { name: 'Order ZN7K-Q4M2-X9TD' })).toBeVisible();
    expect(screen.getByText(/· Achieng Otieno$/)).toBeVisible();
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Orders' })).toHaveAttribute(
      'href',
      '/orders',
    );

    const progress = within(screen.getByRole('group', { name: 'Order progress' }));
    const stepState = (label: string) =>
      progress.getByText(label).closest('[data-state]')?.getAttribute('data-state');
    expect(stepState('Pending')).toBe('done');
    expect(stepState('Confirmed')).toBe('current');
    expect(stepState('Dispatched')).toBe('todo');
    expect(stepState('Completed')).toBe('todo');
    expect(progress.getByText(formatDateTime('2026-10-18T09:00:00+00:00'))).toBeVisible();
    expect(screen.queryByText(/Stock held until/)).not.toBeInTheDocument();
  });

  it('copies the order reference', async () => {
    const user = userEvent.setup();
    respondWithOrder(buildConfirmedOrder());
    customRenderAtRoute({ url: '/orders/12' });

    await user.click(await screen.findByRole('button', { name: 'Copy reference' }));

    expect(await screen.findByText('Copied')).toBeVisible();
    expect(await navigator.clipboard.readText()).toBe('ZN7K-Q4M2-X9TD');
  });

  it('shows the stock hold on a pending order', async () => {
    respondWithOrder(buildOrderFixture({ id: 12 }));
    customRenderAtRoute({ url: '/orders/12' });

    expect(
      await screen.findByText(`Stock held until ${formatDateTime('2026-10-19T20:30:00+00:00')}`),
    ).toBeVisible();
  });

  it('lists the items and totals', async () => {
    respondWithOrder(buildConfirmedOrder());
    customRenderAtRoute({ url: '/orders/12' });

    const items = await findItemsCard();
    const firstRow = within(items.getByText('Ankara wrap dress').closest('tr') as HTMLElement);
    expect(firstRow.getByText('Medium / Blue')).toBeVisible();
    expect(firstRow.getByText('ANKARA-WRAP-DRESS-M-BLU')).toBeVisible();
    expect(firstRow.getByText('2')).toBeVisible();
    expect(firstRow.getByText('KES 4,500.00')).toBeVisible();
    expect(firstRow.getByText('KES 9,000.00')).toBeVisible();
    expect(items.getByText('Kitenge shirt')).toBeVisible();

    expect(items.getByText('Subtotal')).toBeVisible();
    expect(items.getByText('KES 11,000.00')).toBeVisible();
    expect(items.queryByText('Offer savings')).not.toBeInTheDocument();
    expect(items.getByText('Delivery · Nairobi CBD')).toBeVisible();
    expect(items.getByText('KES 500.00')).toBeVisible();
    expect(items.getByText('Total')).toBeVisible();
    expect(items.getByText('KES 11,500.00')).toBeVisible();
  });

  it('shows offer savings when there are any', async () => {
    respondWithOrder(buildConfirmedOrder({ discount_total: buildMoney('500.00') }));
    customRenderAtRoute({ url: '/orders/12' });

    const items = await findItemsCard();
    expect(items.getByText('Offer savings')).toBeVisible();
    expect(items.getByText('−KES 500.00')).toBeVisible();
  });

  it('shows a pending delivery quote and the total so far', async () => {
    respondWithOrder(
      buildConfirmedOrder({
        zone_name: null,
        delivery_fee_pending: true,
        grand_total: buildMoney('11000.00'),
        delivery_charge: { zone_name: null, fee: null, source: null, pending_quote: true },
      }),
    );
    customRenderAtRoute({ url: '/orders/12' });

    const items = await findItemsCard();
    expect(items.getByText('Delivery · No zone')).toBeVisible();
    expect(items.getByText('Pending quote')).toBeVisible();
    expect(items.getByText('Total so far')).toBeVisible();
    expect(items.queryByText('Total')).not.toBeInTheDocument();
  });

  it('shows the buyer with a call link and the address', async () => {
    respondWithOrder(buildConfirmedOrder());
    customRenderAtRoute({ url: '/orders/12' });

    await screen.findByRole('heading', { name: 'Buyer' });
    const buyer = getCard('Buyer');
    expect(buyer.getByRole('link', { name: 'Call buyer' })).toHaveAttribute(
      'href',
      'tel:+254712345678',
    );
    expect(buyer.getByText('Achieng Otieno')).toBeVisible();
    expect(buyer.getByText('+254712345678')).toBeVisible();
    expect(buyer.getByText('achieng@example.test')).toBeVisible();
    expect(buyer.getByText('12 Ngong Road')).toBeVisible();
    expect(buyer.getByText('Nairobi, Nairobi, 00100')).toBeVisible();
    expect(buyer.getByText('Kenya')).toBeVisible();
  });

  it('explains when there is no delivery yet and shows the payment as unpaid', async () => {
    respondWithOrder(buildOrderFixture({ id: 12 }));
    customRenderAtRoute({ url: '/orders/12' });

    await screen.findByRole('heading', { name: 'Delivery' });
    expect(
      getCard('Delivery').getByText("No delivery yet. It's created when you dispatch the order."),
    ).toBeVisible();
    const payment = getCard('Payment');
    expect(payment.getByText('Unpaid')).toBeVisible();
    expect(
      payment.getByText(
        "Online payment isn't enabled for this store yet. Agree payment with the buyer when you call.",
      ),
    ).toBeVisible();
  });

  it('shows the delivery and opens it', async () => {
    respondWithOrder(
      buildConfirmedOrder({
        delivery: buildOrderDeliveryFixture({
          id: 5,
          status: 'in_transit',
          status_label: 'In transit',
          tracking_number: 'KE88213',
          tracking_url: 'https://track.swiftriders.test/KE88213',
        }),
      }),
    );
    const { router } = customRenderAtRoute({ url: '/orders/12' });

    await screen.findByRole('heading', { name: 'Delivery' });
    const delivery = getCard('Delivery');
    expect(delivery.getByText('In transit')).toBeVisible();
    expect(delivery.getByText('Courier', { selector: 'dd' })).toBeVisible();
    expect(delivery.getByText('Swift Riders')).toBeVisible();
    expect(delivery.getByRole('link', { name: 'KE88213' })).toHaveAttribute(
      'href',
      'https://track.swiftriders.test/KE88213',
    );
    expect(delivery.getByText('Nairobi CBD')).toBeVisible();
    expect(getCard('Payment').getByText('Arranged offline')).toBeVisible();

    await userEvent.click(delivery.getByRole('button', { name: 'Open delivery' }));
    expect(router.state.location.pathname).toBe('/deliveries/5');
  });

  it('shows the activity newest first', async () => {
    respondWithOrder(buildConfirmedOrder({ delivery: buildOrderDeliveryFixture() }));
    customRenderAtRoute({ url: '/orders/12' });

    await screen.findByRole('heading', { name: 'Activity' });
    const entries = within(getCard('Activity').getByRole('list')).getAllByRole('listitem');
    expect(entries).toHaveLength(3);
    expect(entries[0]).toHaveTextContent(/^Delivery created/);
    expect(entries[1]).toHaveTextContent(/^Order confirmed/);
    expect(entries[2]).toHaveTextContent(/^Order placed/);
    expect(getCard('Activity').getByText('by Wanjiru Kamau')).toBeVisible();
  });

  it('shows the order reference as the last breadcrumb', async () => {
    respondWithOrder(buildConfirmedOrder());
    customRenderAtRoute({ url: '/orders/12' });

    const breadcrumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(await within(breadcrumb).findByText('ZN7K-Q4M2-X9TD')).toBeVisible();
    expect(within(breadcrumb).getByText('Sales')).toBeVisible();
    expect(within(breadcrumb).getByText('Orders')).toBeVisible();
  });

  it('shows Page not found for a non-numeric order id', async () => {
    respondWithOrder(buildConfirmedOrder());
    customRenderAtRoute({ url: '/orders/abc' });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Page not found')).toBeVisible();
    expect(within(breadcrumb).queryByText('Orders')).not.toBeInTheDocument();
  });

  it('shows Page not found for a missing order', async () => {
    respondWithOrder(buildConfirmedOrder());
    server.use(
      http.get(mockEndpoints.order, () =>
        HttpResponse.json({ message: 'Not found.' }, { status: 404 }),
      ),
    );
    customRenderAtRoute({ url: '/orders/99' });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  it('offers a retry when the order fails to load', async () => {
    respondWithOrder(buildConfirmedOrder());
    let attempts = 0;
    server.use(
      http.get(mockEndpoints.order, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ message: 'Server error.' }, { status: 500 })
          : HttpResponse.json({ data: buildConfirmedOrder() });
      }),
    );
    customRenderAtRoute({ url: '/orders/12' });

    expect(await screen.findByText("Couldn't load this order. Try again.")).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Order ZN7K-Q4M2-X9TD' })).toBeVisible();
  });
});
