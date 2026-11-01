import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type Product, type ProductStatus } from '@/types/catalogue';
import { customRenderAtRoute } from '@/tests/customRender';
import {
  buildCategoryFixture,
  buildMoney,
  buildProductFixture,
  buildVariantFixture,
} from '@/tests/fixtures/catalogue';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

type RecordedRequest = { method: string; path: string; body: unknown };

const allPermissions = buildUserFixture().memberships[0].permissions;

function buildUserWithout(permission: string) {
  const user = buildUserFixture();
  return {
    ...user,
    memberships: [
      {
        ...user.memberships[0],
        permissions: allPermissions.filter((slug) => slug !== permission),
      },
    ],
  };
}

function buildDetailProduct(overrides: Partial<Product> = {}): Product {
  return buildProductFixture({
    category_ids: [1],
    variants: [
      buildVariantFixture({ id: 1, stock: { on_hand: 5, reserved: 2, available: 3 } }),
      buildVariantFixture({
        id: 2,
        is_default: false,
        price: buildMoney('5200.00'),
        effective_price: buildMoney('5200.00'),
        stock: { on_hand: 6, reserved: 0, available: 6 },
      }),
      buildVariantFixture({
        id: 3,
        is_default: false,
        stock: { on_hand: 3, reserved: 0, available: 3 },
      }),
    ],
    ...overrides,
  });
}

const productPath = '/api/v1/stores/1/products/1';

function setUp({
  user = buildUserFixture(),
  product = buildDetailProduct(),
  state,
}: {
  user?: ReturnType<typeof buildUserFixture>;
  product?: Product;
  state?: unknown;
} = {}) {
  const requests: RecordedRequest[] = [];
  let current = product;

  async function record(request: Request) {
    const path = new URL(request.url).pathname;
    const contentType = request.headers.get('content-type') ?? '';
    const body: unknown = contentType.includes('application/json') ? await request.json() : null;
    requests.push({ method: request.method, path, body });
    return body;
  }

  function moveTo(status: ProductStatus) {
    current = { ...current, status };
    return HttpResponse.json({ data: current });
  }

  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.categories, () => HttpResponse.json({ data: [buildCategoryFixture()] })),
    http.get(mockEndpoints.product, () => HttpResponse.json({ data: current })),
    http.patch(mockEndpoints.product, async ({ request }) => {
      const body = (await record(request)) as Partial<Product> & { price?: string | null };
      current = {
        ...current,
        ...body,
        price: 'price' in body ? (body.price ? buildMoney(body.price) : null) : current.price,
      };
      return HttpResponse.json({ data: current });
    }),
    http.post(mockEndpoints.productPublish, async ({ request }) => {
      await record(request);
      return moveTo('published');
    }),
    http.post(mockEndpoints.productUnpublish, async ({ request }) => {
      await record(request);
      return moveTo('draft');
    }),
    http.post(mockEndpoints.productArchive, async ({ request }) => {
      await record(request);
      return moveTo('archived');
    }),
  );

  const rendered = customRenderAtRoute({ url: '/products/1', state });
  return { ...rendered, requests };
}

async function waitForProduct(title = 'Ankara wrap dress') {
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(title);
}

function getCard(title: string) {
  const heading = screen.getByRole('heading', { level: 3, name: title });
  const card = heading.closest('section');
  if (!card) throw new Error(`No card titled ${title}`);
  return within(card);
}

function getBackLink() {
  return within(screen.getByRole('main')).getByRole('link', { name: 'Products' });
}

describe('Product detail', () => {
  it('shows the product with its status, summary and cards', async () => {
    setUp();
    await waitForProduct();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Draft');
    expect(screen.getByText('Dresses · 3 variants · 14 on hand')).toBeVisible();

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ankara wrap dress');
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('1');
    expect(screen.getByRole('textbox', { name: 'URL handle' })).toHaveValue('ankara-wrap-dress');
    expect(screen.getByText('Old links keep working after you change it.')).toBeVisible();

    const visibility = getCard('Visibility');
    expect(visibility.getByText('Hidden from the storefront until you publish.')).toBeVisible();

    const pricing = getCard('Pricing');
    expect(pricing.getByRole('textbox', { name: 'Base price' })).toHaveValue('4500.00');
    expect(pricing.getByText('KES 4,500.00 – 5,200.00')).toBeVisible();

    const inventory = getCard('Inventory');
    expect(inventory.getByText('On hand').nextSibling).toHaveTextContent('14');
    expect(inventory.getByText('Held in pending orders').nextSibling).toHaveTextContent('2');
    expect(inventory.getByText('Out of stock variants').nextSibling).toHaveTextContent('0');
  });

  it('warns when stock is running low or sold out', async () => {
    setUp({
      product: buildDetailProduct({
        variants: [buildVariantFixture({ stock: { on_hand: 0, reserved: 0, available: 0 } })],
      }),
    });
    await waitForProduct();

    expect(getCard('Inventory').getByText('Sold out — buyers see “Out of stock”.')).toBeVisible();
  });

  it('saves only the changed fields', async () => {
    const { requests } = setUp();
    await waitForProduct();
    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    expect(saveButton).toBeDisabled();

    const name = screen.getByRole('textbox', { name: 'Name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Ankara maxi dress');
    expect(saveButton).toBeEnabled();
    await userEvent.click(saveButton);

    expect(await screen.findByText('Product saved')).toBeVisible();
    expect(requests).toEqual([
      { method: 'PATCH', path: productPath, body: { title: 'Ankara maxi dress' } },
    ]);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled(),
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ankara maxi dress');
  });

  it('saves a changed variant price after the product', async () => {
    const { requests } = setUp();
    await waitForProduct();

    const basePrice = screen.getByRole('textbox', { name: 'Base price' });
    await userEvent.clear(basePrice);
    await userEvent.type(basePrice, '4800');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category' }), '');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Product saved')).toBeVisible();
    expect(requests).toEqual([
      { method: 'PATCH', path: productPath, body: { category_ids: [], price: '4800.00' } },
    ]);
  });

  it('maps a save 422 onto the field and shows it above the cards', async () => {
    const { requests } = setUp();
    server.use(
      http.patch(mockEndpoints.product, () =>
        HttpResponse.json(
          {
            message: 'This slug is already in use.',
            errors: { slug: ['This slug is already in use.'] },
          },
          { status: 422 },
        ),
      ),
    );
    await waitForProduct();

    const slug = screen.getByRole('textbox', { name: 'URL handle' });
    await userEvent.clear(slug);
    await userEvent.type(slug, 'wrap-dress');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(slug).toHaveAccessibleDescription('This slug is already in use.'));
    expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toContain(
      'This slug is already in use.',
    );
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
    expect(requests).toEqual([]);
  });

  it('publishes, unpublishes, archives and restores', async () => {
    const { requests } = setUp();
    await waitForProduct();

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(await screen.findByText('Product published')).toBeVisible();
    expect(await screen.findByRole('button', { name: 'Unpublish' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Published');
    expect(
      screen.getByText('Live on the storefront. Variants switched off can’t be bought.'),
    ).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
    expect(await screen.findByText('Product unpublished')).toBeVisible();
    expect(await screen.findByRole('button', { name: 'Publish' })).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Archive this product?' }));
    expect(
      dialog.getByText(
        "It's removed from the storefront and can't be ordered. Existing orders aren't affected.",
      ),
    ).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'Archive' }));
    expect(await screen.findByText('Product archived')).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    expect(await screen.findByRole('button', { name: 'Restore' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(await screen.findByText('Product restored to draft')).toBeVisible();
    expect(await screen.findByRole('button', { name: 'Publish' })).toBeVisible();

    expect(requests.map(({ method, path }) => `${method} ${path}`)).toEqual([
      `POST ${productPath}/publish`,
      `POST ${productPath}/unpublish`,
      `POST ${productPath}/archive`,
      `POST ${productPath}/unpublish`,
    ]);
  });

  it('keeps unsaved edits when the status changes', async () => {
    setUp();
    await waitForProduct();

    const name = screen.getByRole('textbox', { name: 'Name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Ankara maxi dress');
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(await screen.findByRole('button', { name: 'Unpublish' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ankara maxi dress');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('makes an archived product read-only', async () => {
    setUp({ product: buildDetailProduct({ status: 'archived' }) });
    await waitForProduct();

    for (const textbox of screen.getAllByRole('textbox')) expect(textbox).toBeDisabled();
    for (const select of screen.getAllByRole('combobox')) expect(select).toBeDisabled();
    for (const toggle of screen.getAllByRole('switch')) expect(toggle).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Restore' })).toBeVisible();
    for (const name of ['Save changes', 'Publish', 'Unpublish', 'Archive', 'Upload']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    expect(screen.getByText('Archived products are hidden and can’t be ordered.')).toBeVisible();
  });

  it('shows no actions and disables inputs without catalogue.manage', async () => {
    setUp({ user: buildUserWithout('catalogue.manage') });
    await waitForProduct();

    for (const textbox of screen.getAllByRole('textbox')) expect(textbox).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Category' })).toBeDisabled();
    for (const name of ['Save changes', 'Publish', 'Archive']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('shows the API message when publishing fails', async () => {
    setUp();
    server.use(
      http.post(mockEndpoints.productPublish, () =>
        HttpResponse.json(
          {
            message: 'A product needs a price to be published.',
            errors: { price: ['A product needs a price to be published.'] },
          },
          { status: 422 },
        ),
      ),
    );
    await waitForProduct();

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A product needs a price to be published.',
    );
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
  });

  it('asks before leaving with unsaved changes', async () => {
    const { router } = setUp();
    await waitForProduct();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), ' long');
    await userEvent.click(getBackLink());

    const dialog = within(await screen.findByRole('dialog', { name: 'Discard changes?' }));
    expect(dialog.getByText("Your edits haven't been saved.")).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/products/1');
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ankara wrap dress long');

    await userEvent.click(getBackLink());
    const secondDialog = within(await screen.findByRole('dialog', { name: 'Discard changes?' }));
    await userEvent.click(secondDialog.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'));
  });

  it('leaves without asking when nothing changed', async () => {
    const { router } = setUp();
    await waitForProduct();

    await userEvent.click(getBackLink());

    await waitFor(() => expect(router.state.location.pathname).toBe('/products'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the save issues passed from Add product', async () => {
    setUp({ state: { saveIssues: "Saved as a draft, but 1 image didn't save." } });
    await waitForProduct();

    expect(screen.getByRole('alert')).toHaveTextContent(
      "Saved as a draft, but 1 image didn't save.",
    );
  });

  it('never sends a price without pricing.manage', async () => {
    const { requests } = setUp({ user: buildUserWithout('pricing.manage') });
    await waitForProduct();

    const basePrice = screen.getByRole('textbox', { name: 'Base price' });
    expect(basePrice).toBeDisabled();
    expect(basePrice).toHaveAccessibleDescription("You can't set prices");

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), ' long');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Product saved')).toBeVisible();
    expect(requests).toEqual([
      { method: 'PATCH', path: productPath, body: { title: 'Ankara wrap dress long' } },
    ]);
  });

  it('shows Page not found for a missing product', async () => {
    setUp();
    server.use(
      http.get(mockEndpoints.product, () =>
        HttpResponse.json({ message: 'Not found.' }, { status: 404 }),
      ),
    );

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  it('shows no access on a 403 and stays signed in', async () => {
    const { router } = setUp();
    server.use(
      http.get(mockEndpoints.product, () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 }),
      ),
    );

    expect(await screen.findByText("You don't have access to products.")).toBeVisible();
    expect(router.state.location.pathname).toBe('/products/1');
  });

  it('keeps the featured switch disabled unless published', async () => {
    const { requests } = setUp();
    await waitForProduct();

    const featured = screen.getByRole('switch', { name: 'Featured on homepage' });
    expect(featured).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await screen.findByRole('button', { name: 'Unpublish' });
    expect(featured).toBeEnabled();

    await userEvent.click(featured);
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Product saved');
    expect(requests.at(-1)).toEqual({
      method: 'PATCH',
      path: productPath,
      body: { is_featured: true },
    });
  });
});
