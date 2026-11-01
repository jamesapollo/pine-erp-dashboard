import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type ProductListItem } from '@/types/catalogue';
import { customRenderAtRoute } from '@/tests/customRender';
import {
  buildCategoryFixture,
  buildPaginated,
  buildProductListItemFixture,
} from '@/tests/fixtures/catalogue';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

const categories = [
  buildCategoryFixture({ id: 1, name: 'Dresses' }),
  buildCategoryFixture({ id: 2, name: 'Tops', slug: 'tops', sort_order: 1 }),
];

function respondWithProducts(
  products: ProductListItem[],
  totals: Partial<Record<string, number>> = {},
) {
  const requests: URLSearchParams[] = [];
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })),
    http.get(mockEndpoints.categories, () => HttpResponse.json({ data: categories })),
    http.get(mockEndpoints.products, ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params);
      const total = totals[params.get('status') ?? 'all'] ?? products.length;
      return HttpResponse.json(buildPaginated(products, { total }));
    }),
  );
  return requests;
}

function listRequests(requests: URLSearchParams[]) {
  return requests.filter((params) => params.get('per_page') !== '1');
}

describe('Products list', () => {
  it('lists products with status, variants, available stock and base price', async () => {
    respondWithProducts([
      buildProductListItemFixture({
        id: 7,
        category_ids: [1, 99],
        is_featured: true,
        variants_count: 3,
        stock_available: 5,
      }),
    ]);
    customRenderAtRoute({ url: '/products' });

    const row = (await screen.findByText('Ankara wrap dress')).closest('tr');
    expect(row).not.toBeNull();
    const scope = within(row as HTMLElement);
    expect(scope.getByText('Draft')).toBeVisible();
    expect(scope.getByText('3')).toBeVisible();
    expect(scope.getByText('5')).toBeVisible();
    expect(scope.getByText('4,500.00')).toBeVisible();
    expect(scope.getByText('Dresses')).toBeVisible();
    expect(scope.getByText('Featured')).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Available' })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Price (KES)' })).toBeVisible();
  });

  it('shows tab counts and filters by status', async () => {
    const requests = respondWithProducts([buildProductListItemFixture()], {
      all: 61,
      published: 40,
      draft: 20,
      archived: 1,
    });
    const { router } = customRenderAtRoute({ url: '/products' });

    const publishedTab = await screen.findByRole('tab', { name: /Published/ });
    await waitFor(() => expect(publishedTab).toHaveTextContent('40'));
    expect(screen.getByRole('tab', { name: /All/ })).toHaveTextContent('61');

    await userEvent.click(publishedTab);

    await waitFor(() =>
      expect(listRequests(requests).some((params) => params.get('status') === 'published')).toBe(
        true,
      ),
    );
    expect(router.state.location.search).toBe('?status=published');
  });

  it('searches by name or SKU after typing stops', async () => {
    const requests = respondWithProducts([buildProductListItemFixture()]);
    const { router } = customRenderAtRoute({ url: '/products' });

    await screen.findByText('Ankara wrap dress');
    await userEvent.type(screen.getByRole('textbox', { name: 'Search products' }), 'ANK');

    await waitFor(() =>
      expect(
        listRequests(requests).filter((params) => params.get('search') === 'ANK'),
      ).toHaveLength(1),
    );
    expect(listRequests(requests).some((params) => params.get('search') === 'A')).toBe(false);
    expect(router.state.location.search).toBe('?search=ANK');
  });

  it('filters by category', async () => {
    const requests = respondWithProducts([buildProductListItemFixture()]);
    const { router } = customRenderAtRoute({ url: '/products' });

    await screen.findByText('Ankara wrap dress');
    await screen.findByRole('option', { name: 'Tops' });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Tops');

    await waitFor(() =>
      expect(listRequests(requests).some((params) => params.get('category') === '2')).toBe(true),
    );
    expect(router.state.location.search).toBe('?category=2');
  });

  it('pages through results', async () => {
    const requests = respondWithProducts([buildProductListItemFixture()], { all: 61 });
    const { router } = customRenderAtRoute({ url: '/products' });

    expect(await screen.findByText('1–25 of 61')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() =>
      expect(listRequests(requests).some((params) => params.get('page') === '2')).toBe(true),
    );
    expect(router.state.location.search).toBe('?page=2');
    expect(await screen.findByText('26–50 of 61')).toBeVisible();
  });

  it('shows the empty state with an add button when there are no products', async () => {
    respondWithProducts([]);
    customRenderAtRoute({ url: '/products' });

    expect(await screen.findByText('No products yet')).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Add product' }).length).toBeGreaterThan(1);
  });

  it('says no products match when a filter is set', async () => {
    respondWithProducts([]);
    customRenderAtRoute({ url: '/products?status=archived' });

    expect(await screen.findByText('No products match')).toBeVisible();
  });

  it('opens a product when its row is clicked', async () => {
    respondWithProducts([buildProductListItemFixture({ id: 7 })]);
    const { router } = customRenderAtRoute({ url: '/products' });

    await userEvent.click(await screen.findByText('Ankara wrap dress'));

    await waitFor(() => expect(router.state.location.pathname).toBe('/products/7'));
  });

  it('shows no access when the API answers 403 and keeps the user signed in', async () => {
    respondWithProducts([]);
    server.use(
      http.get(mockEndpoints.products, () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 }),
      ),
    );
    const { router } = customRenderAtRoute({ url: '/products' });

    expect(await screen.findByText("You don't have access to products.")).toBeVisible();
    expect(router.state.location.pathname).toBe('/products');
    expect(screen.getByText(buildUserFixture().name)).toBeVisible();
  });

  it('hides Add product without catalogue.manage but keeps the Categories and Option types links', async () => {
    respondWithProducts([buildProductListItemFixture()]);
    const user = buildUserFixture();
    server.use(
      http.get(mockEndpoints.me, () =>
        HttpResponse.json({
          data: buildUserFixture({
            memberships: user.memberships.map((membership) => ({
              ...membership,
              permissions: membership.permissions.filter((slug) => slug !== 'catalogue.manage'),
            })),
          }),
        }),
      ),
    );
    customRenderAtRoute({ url: '/products' });

    await screen.findByText('Ankara wrap dress');
    expect(screen.queryByRole('button', { name: 'Add product' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Categories' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Option types' })).toBeVisible();
  });
});
