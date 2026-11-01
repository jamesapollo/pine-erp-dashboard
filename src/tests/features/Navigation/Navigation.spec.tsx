import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { customRenderAtRoute } from '@/tests/customRender';
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

  it('hides Products without catalogue.view and shows no access on the URL', async () => {
    respondWithUser(buildUserWithoutCatalogueView());
    customRenderAtRoute({ url: '/products' });

    expect(await screen.findByText("You don't have access to products.")).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Products' })).not.toBeInTheDocument();
  });

  it('shows Page not found for a non-numeric product id', async () => {
    respondWithUser();
    customRenderAtRoute({ url: '/products/abc' });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  it('shows the Overview breadcrumb on the root page', async () => {
    respondWithUser();
    customRenderAtRoute({ url: '/' });

    await screen.findByRole('heading', { name: 'Overview' });
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Overview')).toBeVisible();
  });

  it('matches the fixed product pages before the product detail page', async () => {
    respondWithUser();
    customRenderAtRoute({ url: '/products/option-types' });

    expect(await screen.findByRole('heading', { name: 'Option types' })).toBeVisible();
  });
});
