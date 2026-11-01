import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type VariantStockLevel } from '@/types/catalogue';
import { customRenderAtRoute } from '@/tests/customRender';
import {
  buildCategoryFixture,
  buildPaginated,
  buildVariantStockLevelFixture,
} from '@/tests/fixtures/catalogue';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

function respondWithStock(
  levels: VariantStockLevel[],
  { permissions }: { permissions?: string[] } = {},
) {
  const requests: URLSearchParams[] = [];
  const user = buildUserFixture();
  if (permissions) user.memberships[0].permissions = permissions;
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.categories, () =>
      HttpResponse.json({ data: [buildCategoryFixture({ id: 4, name: 'Dresses' })] }),
    ),
    http.get(mockEndpoints.stockLevels, ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params);
      if (params.get('per_page') === '1') {
        const total =
          params.get('available_max') === '0' ? 2 : params.get('available_min') === '1' ? 3 : 40;
        return HttpResponse.json({
          ...buildPaginated(levels.slice(0, 1), { total, per_page: 1 }),
          totals: { on_hand: 1234, reserved: 7 },
        });
      }
      return HttpResponse.json({
        ...buildPaginated(levels),
        totals: { on_hand: 0, reserved: 0 },
      });
    }),
  );
  return requests;
}

describe('Stock list', () => {
  it('shows the totals, tab counts and each variant with its stock', async () => {
    respondWithStock([
      buildVariantStockLevelFixture({ variant_id: 11 }),
      buildVariantStockLevelFixture({
        variant_id: 12,
        product_title: 'Kitenge apron',
        is_default: true,
        option_values: [],
        sku: 'KIT-APRON',
        stock: { on_hand: 1, reserved: 1, available: 0 },
      }),
    ]);
    customRenderAtRoute({ url: '/inventory' });

    expect(await screen.findByRole('heading', { name: 'Stock' })).toBeVisible();
    expect(await screen.findByText('1,234')).toBeVisible();
    expect(screen.getByText('across 40 variants')).toBeVisible();
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Low stock/ })).toHaveTextContent('3'),
    );
    expect(screen.getByRole('tab', { name: /Out of stock/ })).toHaveTextContent('2');

    const dressLink = await screen.findByRole('link', { name: 'Ankara wrap dress' });
    expect(dressLink).toHaveAttribute('href', '/inventory/11');
    const dressRow = within(dressLink.closest('tr') as HTMLElement);
    expect(dressRow.getByText('M · Indigo')).toBeVisible();
    expect(dressRow.getByText('10')).toBeVisible();
    expect(dressRow.getByText('In stock')).toBeVisible();

    const apronRow = within(
      screen.getByRole('link', { name: 'Kitenge apron' }).closest('tr') as HTMLElement,
    );
    expect(apronRow.getByText('KIT-APRON')).toBeVisible();
    expect(apronRow.getByText('Out of stock')).toBeVisible();
  });

  it('filters by status, search and category through the URL', async () => {
    const user = userEvent.setup();
    const requests = respondWithStock([buildVariantStockLevelFixture()]);
    const { router } = customRenderAtRoute({ url: '/inventory' });
    await screen.findByRole('link', { name: 'Ankara wrap dress' });

    await user.click(screen.getByRole('tab', { name: /Low stock/ }));
    await waitFor(() => expect(router.state.location.search).toBe('?status=low'));
    await waitFor(() =>
      expect(
        requests.some(
          (params) =>
            params.get('per_page') === '25' &&
            params.get('available_min') === '1' &&
            params.get('available_max') === '3',
        ),
      ).toBe(true),
    );

    await user.type(screen.getByRole('textbox', { name: 'Search stock' }), 'indigo');
    await waitFor(() => expect(router.state.location.search).toBe('?status=low&q=indigo'));

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Category' }),
      screen.getByRole('option', { name: 'Dresses' }),
    );
    await waitFor(() =>
      expect(
        requests.some(
          (params) => params.get('category') === '4' && params.get('search') === 'indigo',
        ),
      ).toBe(true),
    );
  });

  it('opens a variant when its row is clicked', async () => {
    const user = userEvent.setup();
    respondWithStock([buildVariantStockLevelFixture({ variant_id: 11 })]);
    const { router } = customRenderAtRoute({ url: '/inventory' });

    await user.click(await screen.findByText('M · Indigo'));

    await waitFor(() => expect(router.state.location.pathname).toBe('/inventory/11'));
  });

  it('leaves out the category filter without catalogue access', async () => {
    respondWithStock([buildVariantStockLevelFixture()], {
      permissions: ['inventory.view'],
    });
    customRenderAtRoute({ url: '/inventory' });

    await screen.findByRole('link', { name: 'Ankara wrap dress' });
    expect(screen.queryByRole('combobox', { name: 'Category' })).not.toBeInTheDocument();
  });

  it('shows no access without inventory.view, and no Stock link in the sidebar', async () => {
    respondWithStock([], { permissions: ['catalogue.view'] });
    customRenderAtRoute({ url: '/inventory' });

    expect(await screen.findByText("You don't have access to stock.")).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Stock' })).not.toBeInTheDocument();
  });
});
