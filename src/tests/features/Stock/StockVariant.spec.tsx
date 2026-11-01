import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type StockMovement, type VariantStockLevel } from '@/types/catalogue';
import { customRenderAtRoute } from '@/tests/customRender';
import {
  buildPaginated,
  buildStockMovementFixture,
  buildVariantStockLevelFixture,
} from '@/tests/fixtures/catalogue';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

function respondWithVariant(
  level: VariantStockLevel,
  movements: StockMovement[],
  { permissions }: { permissions?: string[] } = {},
) {
  const movementRequests: URLSearchParams[] = [];
  const adjustments: unknown[] = [];
  let current = level;
  const user = buildUserFixture();
  if (permissions) user.memberships[0].permissions = permissions;
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.categories, () => HttpResponse.json({ data: [] })),
    http.get(mockEndpoints.stockLevel, () => HttpResponse.json({ data: current })),
    http.get(mockEndpoints.stockMovements, ({ request }) => {
      const params = new URL(request.url).searchParams;
      movementRequests.push(params);
      const type = params.get('type');
      return HttpResponse.json(
        buildPaginated(type ? movements.filter((movement) => movement.type === type) : movements),
      );
    }),
    http.post(mockEndpoints.stockAdjustments, async ({ request }) => {
      const body = (await request.json()) as { change?: number; set_to?: number };
      adjustments.push(body);
      const onHand = body.set_to ?? current.stock.on_hand + (body.change ?? 0);
      const quantity = onHand - current.stock.on_hand;
      current = {
        ...current,
        stock: { ...current.stock, on_hand: onHand, available: onHand - current.stock.reserved },
      };
      return HttpResponse.json(
        {
          data: {
            movement: buildStockMovementFixture({ id: 99, quantity, on_hand_after: onHand }),
            stock: current.stock,
          },
        },
        { status: 201 },
      );
    }),
  );
  return { movementRequests, adjustments };
}

const level = buildVariantStockLevelFixture({ variant_id: 11 });

describe('Stock for one variant', () => {
  it('shows the variant, its stock and its transactions', async () => {
    respondWithVariant(level, [
      buildStockMovementFixture({ id: 2, type: 'sale', quantity: -1, order_id: 41, actor: null }),
      buildStockMovementFixture({ id: 1, reason: 'Opening stock' }),
    ]);
    customRenderAtRoute({ url: '/inventory/11' });

    expect(
      await screen.findByRole('heading', { name: 'Ankara wrap dress · M · Indigo' }),
    ).toBeVisible();
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Stock' })).toHaveAttribute(
      'href',
      '/inventory',
    );
    expect(screen.getByText('AWD-M-INDIGO')).toBeVisible();
    expect(screen.getByText('in pending orders')).toBeVisible();

    const table = within(await screen.findByRole('table', { name: 'Transactions' }));
    expect(table.getByRole('link', { name: 'Order #41' })).toHaveAttribute('href', '/orders/41');
    expect(table.getByText('−1')).toBeVisible();
    expect(table.getByText('Opening stock')).toBeVisible();
    expect(table.getByText('+5')).toBeVisible();
    expect(
      within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText(
        'Ankara wrap dress · M · Indigo',
      ),
    ).toBeVisible();
  });

  it('filters transactions by type', async () => {
    const user = userEvent.setup();
    const { movementRequests } = respondWithVariant(level, [buildStockMovementFixture()]);
    customRenderAtRoute({ url: '/inventory/11' });
    await screen.findByRole('table', { name: 'Transactions' });

    await user.click(screen.getByRole('tab', { name: 'Returns' }));

    expect(await screen.findByText('No return transactions yet.')).toBeVisible();
    expect(
      movementRequests.some(
        (params) => params.get('variant_id') === '11' && params.get('type') === 'return',
      ),
    ).toBe(true);
  });

  it('receives stock without a reason', async () => {
    const user = userEvent.setup();
    const { adjustments } = respondWithVariant(level, []);
    customRenderAtRoute({ url: '/inventory/11' });

    await user.click(await screen.findByRole('button', { name: 'Receive stock' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Adjust stock' }));
    await user.type(dialog.getByRole('textbox', { name: 'Units received' }), '8');
    expect(dialog.getByText('20')).toBeVisible();
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Stock received')).toBeVisible();
    expect(adjustments).toEqual([
      { variant_id: 11, type: 'receipt', change: 8, reason: 'Stock received' },
    ]);
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Adjust stock' })).not.toBeInTheDocument(),
    );
    expect(await screen.findByText('18')).toBeVisible();
  });

  it('removes stock with a reason and checks the form first', async () => {
    const user = userEvent.setup();
    const { adjustments } = respondWithVariant(level, []);
    customRenderAtRoute({ url: '/inventory/11' });

    await user.click(await screen.findByRole('button', { name: 'Remove' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Adjust stock' }));
    await user.type(dialog.getByRole('textbox', { name: 'Units removed' }), '13');
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    expect(await dialog.findByText('Only 12 on hand.')).toBeVisible();
    expect(dialog.getByText('Say why — it’s kept on the record.')).toBeVisible();
    expect(adjustments).toEqual([]);

    await user.clear(dialog.getByRole('textbox', { name: 'Units removed' }));
    await user.type(dialog.getByRole('textbox', { name: 'Units removed' }), '2');
    await user.type(dialog.getByRole('textbox', { name: 'Reason' }), 'Damaged in store');
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Stock adjusted')).toBeVisible();
    expect(adjustments).toEqual([
      { variant_id: 11, type: 'adjustment', change: -2, reason: 'Damaged in store' },
    ]);
  });

  it('sets a count, switching mode inside the dialog', async () => {
    const user = userEvent.setup();
    const { adjustments } = respondWithVariant(level, []);
    customRenderAtRoute({ url: '/inventory/11' });

    await user.click(await screen.findByRole('button', { name: 'Receive stock' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Adjust stock' }));
    await user.click(dialog.getByRole('radio', { name: /Set count/ }));
    await user.type(dialog.getByRole('textbox', { name: 'Counted on hand' }), '9');
    await user.type(dialog.getByRole('textbox', { name: 'Reason' }), 'Stock take');
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    await screen.findByText('Stock adjusted');
    expect(adjustments).toEqual([
      { variant_id: 11, type: 'adjustment', set_to: 9, reason: 'Stock take' },
    ]);
  });

  it('shows the API reason under the quantity when units are held for orders', async () => {
    const user = userEvent.setup();
    respondWithVariant(level, []);
    server.use(
      http.post(mockEndpoints.stockAdjustments, () =>
        HttpResponse.json(
          {
            message: 'Invalid.',
            errors: { change: ['2 are held for orders; cancel or confirm those first.'] },
          },
          { status: 422 },
        ),
      ),
    );
    customRenderAtRoute({ url: '/inventory/11' });

    await user.click(await screen.findByRole('button', { name: 'Remove' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Adjust stock' }));
    await user.type(dialog.getByRole('textbox', { name: 'Units removed' }), '11');
    await user.type(dialog.getByRole('textbox', { name: 'Reason' }), 'Lost');
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    expect(
      await dialog.findByText('2 are held for orders; cancel or confirm those first.'),
    ).toBeVisible();
    expect(screen.getByRole('dialog', { name: 'Adjust stock' })).toBeVisible();
  });

  it('is read-only without inventory.manage', async () => {
    respondWithVariant(level, [], { permissions: ['inventory.view'] });
    customRenderAtRoute({ url: '/inventory/11' });

    await screen.findByRole('heading', { name: 'Ankara wrap dress · M · Indigo' });
    expect(screen.queryByRole('button', { name: 'Receive stock' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('says when the product is archived', async () => {
    respondWithVariant({ ...level, product_status: 'archived' }, []);
    customRenderAtRoute({ url: '/inventory/11' });

    expect(
      await screen.findByText('This product is archived, so this variant isn’t on sale.'),
    ).toBeVisible();
  });

  it('shows page not found for an unknown or malformed variant', async () => {
    respondWithVariant(level, []);
    server.use(
      http.get(mockEndpoints.stockLevel, () =>
        HttpResponse.json({ message: 'Not found.' }, { status: 404 }),
      ),
    );
    customRenderAtRoute({ url: '/inventory/999' });
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});
