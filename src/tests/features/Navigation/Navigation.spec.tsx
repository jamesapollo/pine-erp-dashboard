import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { customRenderAtRoute } from '@/tests/customRender';
import { buildProductFixture } from '@/tests/fixtures/catalogue';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

function respondWithUser(user = buildUserFixture()) {
  server.use(http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })));
}

function buildUserWithoutCatalogueView() {
  const user = buildUserFixture();
  return buildUserFixture({
    memberships: user.memberships.map((membership) => ({
      ...membership,
      permissions: membership.permissions.filter((slug) => slug !== 'catalogue.view'),
    })),
  });
}

describe('Navigation', () => {
  it('shows Products in the sidebar for catalogue staff and opens the list', async () => {
    respondWithUser();
    const { router } = customRenderAtRoute({ url: '/' });

    await userEvent.click(await screen.findByRole('link', { name: 'Products' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/products'));
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Catalogue')).toBeVisible();
    expect(within(breadcrumb).getByText('Products')).toBeVisible();
  });

  it('lists Categories before Products in the Catalogue section', async () => {
    respondWithUser();
    customRenderAtRoute({ url: '/' });

    const sidebar = await screen.findByRole('navigation', { name: 'Main' });
    const linkNames = within(sidebar)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(linkNames.indexOf('Categories')).toBe(linkNames.indexOf('Products') - 1);
  });

  it('opens Categories from the sidebar and marks only it as the current page', async () => {
    respondWithUser();
    const { router } = customRenderAtRoute({ url: '/' });

    const sidebar = await screen.findByRole('navigation', { name: 'Main' });
    await userEvent.click(within(sidebar).getByRole('link', { name: 'Categories' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/products/categories'));
    expect(await screen.findByRole('heading', { name: 'Categories' })).toBeVisible();
    expect(within(sidebar).getByRole('link', { name: 'Categories' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(sidebar).getByRole('link', { name: 'Products' })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('keeps Products current on the other product pages', async () => {
    respondWithUser();
    customRenderAtRoute({ url: '/products/option-types' });

    await screen.findByRole('heading', { name: 'Option types' });
    const sidebar = screen.getByRole('navigation', { name: 'Main' });
    expect(within(sidebar).getByRole('link', { name: 'Products' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(sidebar).getByRole('link', { name: 'Categories' })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('hides Products without catalogue.view and shows no access on the URL', async () => {
    respondWithUser(buildUserWithoutCatalogueView());
    customRenderAtRoute({ url: '/products' });

    expect(await screen.findByText("You don't have access to products.")).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Products' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Categories' })).not.toBeInTheDocument();
  });

  it('shows Page not found for a non-numeric product id', async () => {
    respondWithUser();
    customRenderAtRoute({ url: '/products/abc' });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Page not found')).toBeVisible();
    expect(within(breadcrumb).queryByText('Products')).not.toBeInTheDocument();
  });

  it('shows the product name as the last breadcrumb on the product page', async () => {
    respondWithUser();
    server.use(
      http.get(mockEndpoints.product, () =>
        HttpResponse.json({ data: buildProductFixture({ id: 7, title: 'Kitenge shirt' }) }),
      ),
    );
    customRenderAtRoute({ url: '/products/7' });

    const breadcrumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(await within(breadcrumb).findByText('Kitenge shirt')).toBeVisible();
    expect(within(breadcrumb).getByText('Products')).toBeVisible();
  });

  it('shows the Overview breadcrumb on the root page', async () => {
    respondWithUser();
    customRenderAtRoute({ url: '/' });

    await screen.findByRole('heading', { name: /^Good (morning|afternoon|evening)/ });
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Overview')).toBeVisible();
  });

  it('matches the fixed product pages before the product detail page', async () => {
    respondWithUser();
    customRenderAtRoute({ url: '/products/option-types' });

    expect(await screen.findByRole('heading', { name: 'Option types' })).toBeVisible();
  });
});
