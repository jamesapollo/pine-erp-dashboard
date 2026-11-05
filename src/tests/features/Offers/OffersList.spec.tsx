import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type Offer } from '@/types/pricing';
import { customRenderAtRoute } from '@/tests/customRender';
import { buildPaginated } from '@/tests/fixtures/catalogue';
import { buildOfferFixture } from '@/tests/fixtures/pricing';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

function buildUserWithPermissions(filter: (slug: string) => boolean) {
  const user = buildUserFixture();
  return buildUserFixture({
    memberships: user.memberships.map((membership) => ({
      ...membership,
      permissions: membership.permissions.filter(filter),
    })),
  });
}

function respondWithOffers(
  offers: Offer[],
  totals: Partial<Record<string, number>> = {},
  user = buildUserFixture(),
) {
  const requests: URLSearchParams[] = [];
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.offers, ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params);
      const total = totals[params.get('status') ?? 'all'] ?? offers.length;
      return HttpResponse.json(buildPaginated(offers, { total }));
    }),
  );
  return requests;
}

function listRequests(requests: URLSearchParams[]) {
  return requests.filter((params) => params.get('per_page') !== '1');
}

describe('Offers list', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-21T12:00:00Z') });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists each offer with its targets, discount, run and status', async () => {
    respondWithOffers([
      buildOfferFixture({
        id: 4,
        name: 'Mashujaa Day sale',
        categories: [
          { id: 1, name: 'Dresses' },
          { id: 2, name: 'Shirts' },
        ],
        products: [{ id: 9, title: 'Kitenge shirt' }],
      }),
      buildOfferFixture({
        id: 5,
        name: 'Clearance',
        type: 'sale_price',
        value: '990.00',
        is_active: false,
        status: 'inactive',
      }),
    ]);
    customRenderAtRoute({ url: '/offers' });

    expect(await screen.findByRole('heading', { name: 'Offers' })).toBeVisible();
    const table = await screen.findByRole('table', { name: 'Offers' });
    const [, liveRow, pausedRow] = within(table).getAllByRole('row');
    expect(within(liveRow).getByRole('link', { name: 'Mashujaa Day sale' })).toHaveAttribute(
      'href',
      '/offers/4',
    );
    expect(within(liveRow).getByText('Dresses, Shirts +1')).toBeVisible();
    expect(within(liveRow).getByText('15% off')).toBeVisible();
    expect(within(liveRow).getByText('Percent off')).toBeVisible();
    expect(within(liveRow).getByText('Ends in 6 days')).toBeVisible();
    expect(within(liveRow).getByText('Live')).toBeVisible();
    expect(within(pausedRow).getByText('KES 990.00')).toBeVisible();
    expect(within(pausedRow).getByText('Sale price')).toBeVisible();
    expect(within(pausedRow).getByText('Paused')).toBeVisible();
    expect(within(pausedRow).getByText('Inactive')).toBeVisible();
  });

  it('counts the All, Live and Scheduled tabs and filters by status', async () => {
    const requests = respondWithOffers([buildOfferFixture()], { all: 7, live: 2, scheduled: 3 });
    const { router } = customRenderAtRoute({ url: '/offers' });

    const tabs = await screen.findByRole('tablist', { name: 'Offer status' });
    expect(await within(tabs).findByRole('tab', { name: /All\s*7/ })).toBeVisible();
    expect(within(tabs).getByRole('tab', { name: /Live\s*2/ })).toBeVisible();
    expect(within(tabs).getByRole('tab', { name: /Scheduled\s*3/ })).toBeVisible();

    await userEvent.click(within(tabs).getByRole('tab', { name: 'Ended' }));

    await waitFor(() => expect(router.state.location.search).toBe('?status=ended'));
    await waitFor(() => expect(listRequests(requests).at(-1)?.get('status')).toBe('ended'));
  });

  it('searches by offer name', async () => {
    const requests = respondWithOffers([]);
    customRenderAtRoute({ url: '/offers' });

    await userEvent.type(await screen.findByRole('textbox', { name: 'Search offers' }), 'sale');

    await waitFor(() => expect(listRequests(requests).at(-1)?.get('q')).toBe('sale'));
  });

  it('opens an offer when its row is clicked', async () => {
    respondWithOffers([buildOfferFixture({ id: 4 })]);
    const { router } = customRenderAtRoute({ url: '/offers' });

    await userEvent.click(await screen.findByText('Ends in 6 days'));

    await waitFor(() => expect(router.state.location.pathname).toBe('/offers/4'));
  });

  it('explains how to start when there are no offers', async () => {
    respondWithOffers([]);
    customRenderAtRoute({ url: '/offers' });

    expect(await screen.findByText('No offers yet')).toBeVisible();
  });

  it('offers Create offer only with pricing.manage', async () => {
    respondWithOffers(
      [],
      {},
      buildUserWithPermissions((slug) => slug !== 'pricing.manage'),
    );
    customRenderAtRoute({ url: '/offers' });

    await screen.findByRole('heading', { name: 'Offers' });
    expect(screen.queryByRole('button', { name: 'Create offer' })).not.toBeInTheDocument();
  });

  it('opens the new offer page from Create offer', async () => {
    respondWithOffers([]);
    const { router } = customRenderAtRoute({ url: '/offers' });

    await userEvent.click(await screen.findByRole('button', { name: 'Create offer' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/offers/new'));
  });

  it('shows no access without pricing.view and hides the sidebar link', async () => {
    respondWithOffers(
      [],
      {},
      buildUserWithPermissions((slug) => !slug.startsWith('pricing.')),
    );
    customRenderAtRoute({ url: '/offers' });

    expect(await screen.findByText("You don't have access to offers.")).toBeVisible();
    const sidebar = screen.getByRole('navigation', { name: 'Main' });
    expect(within(sidebar).queryByRole('link', { name: 'Offers' })).not.toBeInTheDocument();
  });

  it('shows Offers in the Catalogue section after Products', async () => {
    respondWithOffers([]);
    customRenderAtRoute({ url: '/offers' });

    const sidebar = await screen.findByRole('navigation', { name: 'Main' });
    const names = within(sidebar)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(names.indexOf('Offers')).toBe(names.indexOf('Products') + 1);
    expect(within(sidebar).getByRole('link', { name: 'Offers' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Catalogue')).toBeVisible();
    expect(within(breadcrumb).getByText('Offers')).toBeVisible();
  });

  it('keeps Offers in the sidebar for someone with pricing but not catalogue access', async () => {
    respondWithOffers(
      [],
      {},
      buildUserWithPermissions((slug) => !slug.startsWith('catalogue.')),
    );
    customRenderAtRoute({ url: '/offers' });

    const sidebar = await screen.findByRole('navigation', { name: 'Main' });
    expect(within(sidebar).getByRole('link', { name: 'Offers' })).toBeVisible();
    expect(within(sidebar).queryByRole('link', { name: 'Products' })).not.toBeInTheDocument();
  });

  it('offers a retry when the list fails', async () => {
    respondWithOffers([]);
    server.use(http.get(mockEndpoints.offers, () => HttpResponse.json({}, { status: 500 })));
    customRenderAtRoute({ url: '/offers' });

    expect(await screen.findByText("Couldn't load offers. Try again.")).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
