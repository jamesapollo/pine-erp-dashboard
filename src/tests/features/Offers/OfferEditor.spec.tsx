import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type Offer } from '@/types/pricing';
import { customRenderAtRoute } from '@/tests/customRender';
import {
  buildCategoryFixture,
  buildPaginated,
  buildProductListItemFixture,
} from '@/tests/fixtures/catalogue';
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

function respondWithCatalogue(user = buildUserFixture()) {
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.categories, () =>
      HttpResponse.json({
        data: [
          buildCategoryFixture({ id: 1, name: 'Dresses' }),
          buildCategoryFixture({ id: 2, name: 'Shirts', slug: 'shirts', sort_order: 1 }),
          buildCategoryFixture({ id: 3, name: 'New In', slug: 'new-in', kind: 'new_in' }),
        ],
      }),
    ),
    http.get(mockEndpoints.products, ({ request }) => {
      const search = new URL(request.url).searchParams.get('search') ?? '';
      const products = [
        buildProductListItemFixture({ id: 11, title: 'Ankara wrap dress', category_ids: [1] }),
        buildProductListItemFixture({ id: 12, title: 'Kitenge shirt', category_ids: [2] }),
        buildProductListItemFixture({ id: 13, title: 'Old tote', status: 'archived' }),
      ].filter((product) => product.title.toLowerCase().includes(search.toLowerCase()));
      return HttpResponse.json(buildPaginated(products));
    }),
  );
}

function respondWithOffer(offer: Offer) {
  server.use(http.get(mockEndpoints.offer, () => HttpResponse.json({ data: offer })));
}

function captureSave(method: 'post' | 'patch', respondWith?: Offer) {
  const bodies: Record<string, unknown>[] = [];
  const endpoint = method === 'post' ? mockEndpoints.offers : mockEndpoints.offer;
  server.use(
    http[method](endpoint, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      bodies.push(body);
      return HttpResponse.json(
        { data: respondWith ?? buildOfferFixture({ id: 30, name: String(body.name) }) },
        { status: method === 'post' ? 201 : 200 },
      );
    }),
  );
  return bodies;
}

describe('Offer editor', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-21T12:00:00Z') });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a percent-off offer on a category and returns to the list', async () => {
    respondWithCatalogue();
    const bodies = captureSave('post');
    const { router } = customRenderAtRoute({ url: '/offers/new' });

    expect(await screen.findByRole('heading', { name: 'Create offer' })).toBeVisible();
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Mashujaa Day sale');
    await userEvent.type(screen.getByRole('textbox', { name: 'Percent off' }), '15');
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Dresses' }));
    const startsAt = (screen.getByLabelText('Starts') as HTMLInputElement).value;
    const endsAt = (screen.getByLabelText('Ends') as HTMLInputElement).value;
    await userEvent.click(screen.getAllByRole('button', { name: 'Create offer' }).at(-1)!);

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      name: 'Mashujaa Day sale',
      type: 'percent_off',
      value: '15.00',
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      is_active: true,
      category_ids: [1],
      product_ids: [],
    });
    await waitFor(() => expect(router.state.location.pathname).toBe('/offers'));
    expect(await screen.findByText('Offer created')).toBeVisible();
  });

  it('starts a new offer tomorrow for a week', async () => {
    respondWithCatalogue();
    customRenderAtRoute({ url: '/offers/new' });

    const startsAt = (await screen.findByLabelText('Starts')) as HTMLInputElement;
    const endsAt = screen.getByLabelText('Ends') as HTMLInputElement;
    const tomorrow = new Date('2026-10-21T12:00:00Z');
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    expect(new Date(startsAt.value).getTime()).toBe(tomorrow.getTime());
    expect(new Date(endsAt.value).getTime() - tomorrow.getTime()).toBe(7 * 86_400_000);
    expect(screen.getByText('Runs 7 days')).toBeVisible();
  });

  it('shows every problem at once on an empty submit', async () => {
    respondWithCatalogue();
    const bodies = captureSave('post');
    customRenderAtRoute({ url: '/offers/new' });

    await screen.findByRole('heading', { name: 'Create offer' });
    await userEvent.click(screen.getAllByRole('button', { name: 'Create offer' }).at(-1)!);

    expect(await screen.findByText('Name the offer.')).toBeVisible();
    expect(screen.getByText('Enter a percentage between 0 and 100.')).toBeVisible();
    expect(screen.getByText('Pick at least one category or product.')).toBeVisible();
    expect(bodies).toHaveLength(0);
  });

  it('sends a sale price with two decimals', async () => {
    respondWithCatalogue();
    const bodies = captureSave('post');
    customRenderAtRoute({ url: '/offers/new' });

    await userEvent.type(await screen.findByRole('textbox', { name: 'Name' }), 'Clearance');
    await userEvent.click(screen.getByRole('radio', { name: /Sale price/ }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Sale price' }), '3,990');
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Shirts' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Create offer' }).at(-1)!);

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ type: 'sale_price', value: '3990.00' });
  });

  it('leaves special categories out of the picker', async () => {
    respondWithCatalogue();
    customRenderAtRoute({ url: '/offers/new' });

    expect(await screen.findByRole('checkbox', { name: 'Dresses' })).toBeVisible();
    expect(screen.queryByRole('checkbox', { name: 'New In' })).not.toBeInTheDocument();
  });

  it('picks products by search and shows ones already covered by a category', async () => {
    respondWithCatalogue();
    const bodies = captureSave('post');
    customRenderAtRoute({ url: '/offers/new' });

    await userEvent.type(await screen.findByRole('textbox', { name: 'Name' }), 'Weekend');
    await userEvent.type(screen.getByRole('textbox', { name: 'Percent off' }), '10');
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Dresses' }));
    await userEvent.click(screen.getByRole('tab', { name: /Products/ }));

    const dress = await screen.findByRole('checkbox', { name: 'Ankara wrap dress' });
    expect(dress).toBeChecked();
    expect(dress).toBeDisabled();
    expect(screen.getByText('Included via Dresses')).toBeVisible();
    expect(screen.queryByRole('checkbox', { name: 'Old tote' })).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: 'Search products' }), 'kitenge');
    // The search waits 300 ms before it asks, so allow longer than waitFor's default second.
    await waitFor(
      () =>
        expect(
          screen.queryByRole('checkbox', { name: 'Ankara wrap dress' }),
        ).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Kitenge shirt' }));
    expect(screen.getByRole('tab', { name: /Products\s*1/ })).toBeVisible();
    await userEvent.click(screen.getAllByRole('button', { name: 'Create offer' }).at(-1)!);

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ category_ids: [1], product_ids: [12] });
  });

  it('edits an offer and keeps its variants', async () => {
    respondWithCatalogue();
    respondWithOffer(
      buildOfferFixture({
        id: 4,
        name: 'Mashujaa Day sale',
        products: [{ id: 12, title: 'Kitenge shirt' }],
        variants: [{ id: 50, sku: 'DRS-S', product_id: 11 }],
      }),
    );
    const bodies = captureSave('patch');
    const { router } = customRenderAtRoute({ url: '/offers/4' });

    expect(await screen.findByRole('heading', { name: /Mashujaa Day sale/ })).toBeVisible();
    expect(
      screen.getByText('Also applies to 1 variant chosen elsewhere. Saving keeps it.'),
    ).toBeVisible();
    const value = screen.getByRole('textbox', { name: 'Percent off' });
    expect(value).toHaveValue('15');
    await userEvent.clear(value);
    await userEvent.type(value, '20');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ value: '20.00', category_ids: [1], product_ids: [12] });
    expect(bodies[0]).not.toHaveProperty('variant_ids');
    await waitFor(() => expect(router.state.location.pathname).toBe('/offers'));
    expect(await screen.findByText('Offer saved')).toBeVisible();
  });

  it('shows the API validation message under its field', async () => {
    respondWithCatalogue();
    respondWithOffer(buildOfferFixture({ id: 4, type: 'sale_price', value: '990.00' }));
    server.use(
      http.patch(mockEndpoints.offer, () =>
        HttpResponse.json(
          { message: 'Invalid.', errors: { value: ['The price must be at least 1000.00.'] } },
          { status: 422 },
        ),
      ),
    );
    customRenderAtRoute({ url: '/offers/4' });

    await userEvent.type(await screen.findByRole('textbox', { name: 'Name' }), ' 2');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('The price must be at least 1000.00.')).toBeVisible();
  });

  it('pauses an offer from the status card', async () => {
    respondWithCatalogue();
    respondWithOffer(buildOfferFixture({ id: 4 }));
    const bodies = captureSave('patch');
    customRenderAtRoute({ url: '/offers/4' });

    expect(await screen.findByText('Prices on the storefront are discounted now.')).toBeVisible();
    await userEvent.click(screen.getByRole('switch', { name: 'Active' }));
    expect(screen.getByText('Paused: no prices change, whatever the dates.')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ is_active: false });
  });

  it('says when a scheduled offer will start changing prices', async () => {
    respondWithCatalogue();
    customRenderAtRoute({ url: '/offers/new' });

    const startsAt = await screen.findByLabelText('Starts');
    fireEvent.change(startsAt, { target: { value: '2026-11-01T00:00' } });
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2026-11-08T00:00' } });

    expect(screen.getByText('Prices change automatically on 1 Nov.')).toBeVisible();
  });

  it('deletes an offer after confirming and returns to the list', async () => {
    respondWithCatalogue();
    respondWithOffer(buildOfferFixture({ id: 4, name: 'Mashujaa Day sale' }));
    let isDeleted = false;
    server.use(
      http.delete(mockEndpoints.offer, () => {
        isDeleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { router } = customRenderAtRoute({ url: '/offers/4' });

    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete this offer?' });
    expect(within(dialog).getByText('Prices go back to normal straight away.')).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete offer' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/offers'));
    expect(isDeleted).toBe(true);
    expect(await screen.findByText('Offer deleted')).toBeVisible();
  });

  it('is read-only without pricing.manage', async () => {
    respondWithCatalogue(buildUserWithPermissions((slug) => slug !== 'pricing.manage'));
    respondWithOffer(buildOfferFixture({ id: 4, products: [{ id: 12, title: 'Kitenge shirt' }] }));
    customRenderAtRoute({ url: '/offers/4' });

    expect(await screen.findByRole('textbox', { name: 'Name' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.getByText('Dresses')).toBeVisible();
    expect(screen.getByText('Kitenge shirt')).toBeVisible();
  });

  it('shows the offer name in the breadcrumb', async () => {
    respondWithCatalogue();
    respondWithOffer(buildOfferFixture({ id: 4, name: 'Mashujaa Day sale' }));
    customRenderAtRoute({ url: '/offers/4' });

    const breadcrumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(await within(breadcrumb).findByText('Mashujaa Day sale')).toBeVisible();
  });

  it('shows Page not found for a missing or non-numeric offer', async () => {
    respondWithCatalogue();
    server.use(http.get(mockEndpoints.offer, () => HttpResponse.json({}, { status: 404 })));
    customRenderAtRoute({ url: '/offers/abc' });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  it('shows Page not found when the offer is gone', async () => {
    respondWithCatalogue();
    server.use(http.get(mockEndpoints.offer, () => HttpResponse.json({}, { status: 404 })));
    customRenderAtRoute({ url: '/offers/99' });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});
