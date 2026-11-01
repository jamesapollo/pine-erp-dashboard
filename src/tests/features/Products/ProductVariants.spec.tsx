import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import {
  type OptionType,
  type Product,
  type ProductVariant,
  type StockMovement,
} from '@/types/catalogue';
import { customRenderAtRoute } from '@/tests/customRender';
import {
  buildMoney,
  buildOptionTypeFixture,
  buildPaginated,
  buildProductFixture,
  buildStockMovementFixture,
  buildVariantFixture,
} from '@/tests/fixtures/catalogue';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

type RecordedRequest = { method: string; path: string; body: unknown };

const allPermissions = buildUserFixture().memberships[0].permissions;

function buildUserWithout(...permissions: string[]) {
  const user = buildUserFixture();
  return {
    ...user,
    memberships: [
      {
        ...user.memberships[0],
        permissions: allPermissions.filter((slug) => !permissions.includes(slug)),
      },
    ],
  };
}

const size = buildOptionTypeFixture();
const colour = buildOptionTypeFixture({
  id: 2,
  name: 'Colour',
  values: [
    { id: 11, option_type_id: 2, value: 'Red', sort_order: 0, is_active: true, variants_count: 1 },
    { id: 10, option_type_id: 2, value: 'Blue', sort_order: 1, is_active: true, variants_count: 1 },
    {
      id: 12,
      option_type_id: 2,
      value: 'Green',
      sort_order: 2,
      is_active: false,
      variants_count: 0,
    },
  ],
});

const valueNames = new Map(
  [size, colour].flatMap((optionType) =>
    optionType.values.map((value) => [value.id, { optionType, value }] as const),
  ),
);

function buildOptionVariant(
  id: number,
  valueIds: number[],
  overrides: Partial<ProductVariant> = {},
) {
  return buildVariantFixture({
    id,
    is_default: false,
    sku: `ANKARA-${valueIds.join('-')}`,
    option_values: valueIds.map((valueId) => {
      const entry = valueNames.get(valueId);
      if (!entry) throw new Error(`Unknown option value ${valueId}`);
      return {
        option_type_id: entry.optionType.id,
        option_value_id: valueId,
        value: entry.value.value,
      };
    }),
    ...overrides,
  });
}

function buildVariantsProduct(overrides: Partial<Product> = {}): Product {
  return buildProductFixture({
    option_type_ids: [1, 2],
    variants: [
      buildOptionVariant(1, [1, 11], {
        sku: 'ANK-S-RED',
        stock: { on_hand: 5, reserved: 0, available: 5 },
      }),
      buildOptionVariant(2, [2, 10], {
        sku: 'ANK-M-BLUE',
        price: buildMoney('5200.00'),
        effective_price: buildMoney('5200.00'),
        stock: { on_hand: 2, reserved: 0, available: 2 },
      }),
    ],
    ...overrides,
  });
}

const productPath = '/api/v1/stores/1/products/1';

function setUp({
  user = buildUserFixture(),
  product = buildVariantsProduct(),
  optionTypes = [size, colour],
  movementPages = [buildPaginated<StockMovement>([])],
}: {
  user?: ReturnType<typeof buildUserFixture>;
  product?: Product;
  optionTypes?: OptionType[];
  movementPages?: ReturnType<typeof buildPaginated<StockMovement>>[];
} = {}) {
  const requests: RecordedRequest[] = [];
  const movementRequests: string[] = [];
  let current = product;
  let nextVariantId = 100;

  async function record(request: Request) {
    const path = new URL(request.url).pathname;
    const body: unknown = await request.json();
    requests.push({ method: request.method, path, body });
    return body;
  }

  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.categories, () => HttpResponse.json({ data: [] })),
    http.get(mockEndpoints.optionTypes, () => HttpResponse.json({ data: optionTypes })),
    http.get(mockEndpoints.product, () => HttpResponse.json({ data: current })),
    http.patch(mockEndpoints.product, async ({ request }) => {
      const body = (await record(request)) as Partial<Product>;
      current = { ...current, ...body };
      return HttpResponse.json({ data: current });
    }),
    http.patch(mockEndpoints.variant, async ({ request, params }) => {
      const body = (await record(request)) as { price?: string | null; is_active?: boolean };
      const existing = current.variants.find((variant) => variant.id === Number(params.variantId));
      if (!existing) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
      const variant: ProductVariant = {
        ...existing,
        ...('is_active' in body ? { is_active: Boolean(body.is_active) } : {}),
        ...('price' in body
          ? {
              price: body.price ? buildMoney(body.price) : null,
              effective_price: body.price ? buildMoney(body.price) : current.price,
            }
          : {}),
      };
      current = {
        ...current,
        variants: current.variants.map((candidate) =>
          candidate.id === variant.id ? variant : candidate,
        ),
      };
      return HttpResponse.json({ data: variant });
    }),
    http.post(mockEndpoints.variants, async ({ request }) => {
      const body = (await record(request)) as { option_value_ids: number[]; price?: string };
      nextVariantId += 1;
      const variant = buildOptionVariant(nextVariantId, body.option_value_ids, {
        price: body.price ? buildMoney(body.price) : null,
        effective_price: body.price ? buildMoney(body.price) : current.price,
        stock: { on_hand: 0, reserved: 0, available: 0 },
      });
      current = { ...current, variants: [...current.variants, variant] };
      return HttpResponse.json({ data: variant }, { status: 201 });
    }),
    http.post(mockEndpoints.stockAdjustments, async ({ request }) => {
      const body = (await record(request)) as { variant_id: number; change: number };
      const stock = { on_hand: body.change, reserved: 0, available: body.change };
      return HttpResponse.json(
        {
          data: {
            movement: buildStockMovementFixture({
              variant_id: body.variant_id,
              quantity: body.change,
              on_hand_after: body.change,
            }),
            stock,
          },
        },
        { status: 201 },
      );
    }),
    http.get(mockEndpoints.stockMovements, ({ request }) => {
      const url = new URL(request.url);
      movementRequests.push(url.search);
      const page = Number(url.searchParams.get('page') ?? '1');
      return HttpResponse.json(movementPages[page - 1] ?? buildPaginated([]));
    }),
  );

  const rendered = customRenderAtRoute({ url: '/products/1' });
  return { ...rendered, requests, movementRequests };
}

async function waitForProduct() {
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Ankara wrap dress');
}

function getVariantRow(label: string) {
  const table = screen.getByRole('table', { name: 'Variants' });
  const row = within(table)
    .getAllByRole('row')
    .find((candidate) => within(candidate).queryByText(label, { exact: true }));
  if (!row) throw new Error(`No variant row ${label}`);
  return within(row);
}

async function openAddVariant() {
  await userEvent.click(screen.getByRole('button', { name: 'Add variant' }));
  return within(await screen.findByRole('dialog', { name: 'Add variant' }));
}

describe('Product variants', () => {
  it('lists variants with SKU, price, available stock and sellable switch', async () => {
    setUp();
    await waitForProduct();

    expect(screen.getByRole('tab', { name: /^Variants/ })).toHaveTextContent('Variants2');
    const table = within(screen.getByRole('table', { name: 'Variants' }));
    expect(table.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Variant',
      'SKU',
      'Price (KES)',
      'Available',
      'Sellable',
    ]);

    const small = getVariantRow('S · Red');
    expect(small.getByText('ANK-S-RED')).toBeVisible();
    const smallPrice = small.getByRole('textbox', { name: 'Price for S · Red' });
    expect(smallPrice).toHaveValue('');
    expect(smallPrice).toHaveAttribute('placeholder', '4500.00');
    expect(small.getByText('5')).toBeVisible();
    expect(small.getByRole('switch', { name: 'Sellable' })).toBeChecked();

    const medium = getVariantRow('M · Blue');
    expect(medium.getByRole('textbox', { name: 'Price for M · Blue' })).toHaveValue('5200.00');
    expect(medium.getByText('2')).toHaveClass('text-warning-700');
  });

  it('edits a variant price through Save changes', async () => {
    const { requests } = setUp();
    await waitForProduct();

    const name = screen.getByRole('textbox', { name: 'Name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Ankara maxi dress');
    await userEvent.type(screen.getByRole('textbox', { name: 'Price for S · Red' }), '5200');
    await userEvent.clear(screen.getByRole('textbox', { name: 'Price for M · Blue' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Product saved')).toBeVisible();
    expect(requests).toEqual([
      { method: 'PATCH', path: productPath, body: { title: 'Ankara maxi dress' } },
      { method: 'PATCH', path: `${productPath}/variants/1`, body: { price: '5200.00' } },
      { method: 'PATCH', path: `${productPath}/variants/2`, body: { price: null } },
    ]);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled(),
    );
    expect(screen.getByRole('textbox', { name: 'Price for S · Red' })).toHaveValue('5200.00');
    expect(screen.getByRole('textbox', { name: 'Price for M · Blue' })).toHaveValue('');
  });

  it('keeps a variant price edit when its save fails', async () => {
    const { requests } = setUp();
    server.use(
      http.patch(`${productPath}/variants/2`, async ({ request }) => {
        requests.push({
          method: 'PATCH',
          path: `${productPath}/variants/2`,
          body: await request.json(),
        });
        return HttpResponse.json(
          {
            message: 'The price must be at least 0.01.',
            errors: { price: ['The price must be at least 0.01.'] },
          },
          { status: 422 },
        );
      }),
    );
    await waitForProduct();

    await userEvent.type(screen.getByRole('textbox', { name: 'Price for S · Red' }), '5200');
    const mediumPrice = screen.getByRole('textbox', { name: 'Price for M · Blue' });
    await userEvent.clear(mediumPrice);
    await userEvent.type(mediumPrice, '6100');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toContain(
        'The price must be at least 0.01.',
      ),
    );
    expect(requests).toEqual([
      { method: 'PATCH', path: `${productPath}/variants/1`, body: { price: '5200.00' } },
      { method: 'PATCH', path: `${productPath}/variants/2`, body: { price: '6100.00' } },
    ]);
    expect(mediumPrice).toHaveValue('6100');
    expect(mediumPrice).toHaveAccessibleDescription('The price must be at least 0.01.');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('turns a variant off immediately', async () => {
    const { requests } = setUp({ product: buildVariantsProduct({ status: 'published' }) });
    await waitForProduct();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), ' long');
    await userEvent.click(getVariantRow('S · Red').getByRole('switch', { name: 'Sellable' }));

    expect(await screen.findByText('Variant updated')).toBeVisible();
    expect(requests).toEqual([
      { method: 'PATCH', path: `${productPath}/variants/1`, body: { is_active: false } },
    ]);
    await waitFor(() =>
      expect(getVariantRow('S · Red').getByRole('switch', { name: 'Sellable' })).not.toBeChecked(),
    );
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ankara wrap dress long');

    server.use(
      http.patch(`${productPath}/variants/2`, () =>
        HttpResponse.json(
          {
            message: 'A published product must keep one active variant. Unpublish it first.',
            errors: {
              is_active: ['A published product must keep one active variant. Unpublish it first.'],
            },
          },
          { status: 422 },
        ),
      ),
    );
    const mediumSwitch = getVariantRow('M · Blue').getByRole('switch', { name: 'Sellable' });
    await userEvent.click(mediumSwitch);

    await waitFor(() =>
      expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toContain(
        'A published product must keep one active variant. Unpublish it first.',
      ),
    );
    expect(mediumSwitch).toBeChecked();
    expect(mediumSwitch).toBeEnabled();
  });

  it('keeps Save changes disabled after a toggle', async () => {
    setUp();
    await waitForProduct();

    await userEvent.click(getVariantRow('S · Red').getByRole('switch', { name: 'Sellable' }));
    expect(await screen.findByText('Variant updated')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('adds a variant with opening stock', async () => {
    const { requests } = setUp();
    await waitForProduct();

    const dialog = await openAddVariant();
    expect(
      dialog.getByText('Pick a value for each option. Options for this product: Size, Colour.'),
    ).toBeVisible();
    const colourSelect = dialog.getByRole('combobox', { name: 'Colour' });
    expect(
      within(colourSelect)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Red', 'Blue']);
    await userEvent.selectOptions(dialog.getByRole('combobox', { name: 'Size' }), 'M');
    await userEvent.selectOptions(colourSelect, 'Red');
    await userEvent.type(dialog.getByRole('textbox', { name: 'Price' }), '5000');
    const openingStock = dialog.getByRole('textbox', { name: 'Opening stock' });
    expect(openingStock).toHaveAccessibleDescription('Recorded as a receipt');
    await userEvent.type(openingStock, '4');
    await userEvent.click(dialog.getByRole('button', { name: 'Add variant' }));

    expect(await screen.findByText('Variant added')).toBeVisible();
    expect(screen.getByText('M · Red', { selector: '[role="status"] *' })).toBeVisible();
    expect(requests).toEqual([
      {
        method: 'POST',
        path: `${productPath}/variants`,
        body: { option_value_ids: [2, 11], price: '5000.00' },
      },
      {
        method: 'POST',
        path: '/api/v1/stores/1/stock-adjustments',
        body: { variant_id: 101, type: 'receipt', change: 4, reason: 'Opening stock' },
      },
    ]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const added = getVariantRow('M · Red');
    expect(added.getByRole('textbox', { name: 'Price for M · Red' })).toHaveValue('5000.00');
    await waitFor(() => expect(added.getByText('4')).toBeVisible());
    expect(screen.getByRole('tab', { name: /^Variants/ })).toHaveTextContent('Variants3');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('keeps unsaved edits when a variant is added', async () => {
    setUp();
    await waitForProduct();

    await userEvent.type(screen.getByRole('textbox', { name: 'Price for S · Red' }), '4900');
    const dialog = await openAddVariant();
    await userEvent.selectOptions(dialog.getByRole('combobox', { name: 'Size' }), 'L');
    await userEvent.selectOptions(dialog.getByRole('combobox', { name: 'Colour' }), 'Red');
    await userEvent.click(dialog.getByRole('button', { name: 'Add variant' }));

    expect(await screen.findByText('Variant added')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Price for S · Red' })).toHaveValue('4900');
    expect(
      getVariantRow('L · Red').getByRole('textbox', { name: 'Price for L · Red' }),
    ).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('keeps the variant when its opening stock fails', async () => {
    const { requests } = setUp();
    server.use(
      http.post(mockEndpoints.stockAdjustments, () =>
        HttpResponse.json(
          {
            message: "Stock can't go above 1,000,000.",
            errors: { change: ["Stock can't go above 1,000,000."] },
          },
          { status: 422 },
        ),
      ),
    );
    await waitForProduct();

    const dialog = await openAddVariant();
    await userEvent.selectOptions(dialog.getByRole('combobox', { name: 'Size' }), 'M');
    await userEvent.selectOptions(dialog.getByRole('combobox', { name: 'Colour' }), 'Red');
    await userEvent.type(dialog.getByRole('textbox', { name: 'Opening stock' }), '4');
    await userEvent.click(dialog.getByRole('button', { name: 'Add variant' }));

    expect(
      await screen.findByText(
        "Variant added, but its opening stock didn't save: Stock can't go above 1,000,000.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getVariantRow('M · Red').getByText('0')).toBeVisible();
    expect(requests.map(({ method, path }) => `${method} ${path}`)).toEqual([
      `POST ${productPath}/variants`,
    ]);
  });

  it('blocks a combination that already exists', async () => {
    setUp();
    await waitForProduct();

    const dialog = await openAddVariant();
    await userEvent.selectOptions(dialog.getByRole('combobox', { name: 'Size' }), 'S');
    await userEvent.selectOptions(dialog.getByRole('combobox', { name: 'Colour' }), 'Red');
    expect(dialog.getByText('S · Red already exists.')).toBeVisible();
    expect(dialog.getByRole('button', { name: 'Add variant' })).toBeDisabled();
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
  });

  it('says when every combination already exists', async () => {
    setUp({
      optionTypes: [size],
      product: buildVariantsProduct({
        option_type_ids: [1],
        variants: [1, 2, 3].map((valueId) => buildOptionVariant(valueId, [valueId])),
      }),
    });
    await waitForProduct();

    const dialog = await openAddVariant();
    expect(dialog.getByText('Every combination already exists')).toBeVisible();
    expect(dialog.getByText(/All 3 Size combinations are variants\./)).toBeVisible();
    expect(dialog.getByRole('button', { name: 'Add variant' })).toBeDisabled();
  });

  it('has no Add variant for a product without options', async () => {
    setUp({
      product: buildProductFixture({ variants: [buildVariantFixture()] }),
    });
    await waitForProduct();

    expect(getVariantRow('Default').getByText('ANKARA-WRAP-DRESS')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Add variant' })).not.toBeInTheDocument();
  });

  it('has no variant actions for an archived product', async () => {
    setUp({ product: buildVariantsProduct({ status: 'archived' }) });
    await waitForProduct();

    expect(screen.queryByRole('button', { name: 'Add variant' })).not.toBeInTheDocument();
    for (const toggle of screen.getAllByRole('switch', { name: 'Sellable' })) {
      expect(toggle).toBeDisabled();
    }
    expect(screen.getByRole('textbox', { name: 'Price for S · Red' })).toBeDisabled();
  });

  it('shows stock history newest first with load more', async () => {
    const recent = new Date(Date.now() - 12 * 60_000).toISOString();
    const older = '2026-10-18T08:30:00+00:00';
    const { movementRequests } = setUp({
      movementPages: [
        buildPaginated(
          [
            buildStockMovementFixture({
              id: 3,
              variant_id: 1,
              type: 'receipt',
              quantity: 3,
              on_hand_after: 8,
              created_at: recent,
            }),
            buildStockMovementFixture({
              id: 2,
              variant_id: 2,
              type: 'sale',
              quantity: -2,
              on_hand_after: 5,
              actor: null,
              order_id: 12,
              created_at: older,
            }),
          ],
          { total: 3, last_page: 2 },
        ),
        buildPaginated(
          [
            buildStockMovementFixture({
              id: 1,
              variant_id: 99,
              type: 'adjustment',
              quantity: -1,
              on_hand_after: 4,
              actor: null,
              created_at: older,
            }),
          ],
          { total: 3, current_page: 2, last_page: 2 },
        ),
      ],
    });
    await waitForProduct();

    const historyTab = screen.getByRole('tab', { name: /^Stock history/ });
    expect(historyTab).toHaveTextContent(/^Stock history$/);
    expect(movementRequests).toEqual([]);
    expect(screen.getByRole('button', { name: 'Add variant' })).toBeVisible();

    await userEvent.click(historyTab);
    const table = within(await screen.findByRole('table', { name: 'Stock history' }));
    expect(historyTab).toHaveTextContent('Stock history3');
    expect(screen.queryByRole('button', { name: 'Add variant' })).not.toBeInTheDocument();
    expect(table.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'When',
      'Variant',
      'Type',
      'Change',
      'After',
      'By',
    ]);

    const rows = table.getAllByRole('row').slice(1);
    const olderLabel = new Intl.DateTimeFormat('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(older));
    expect(
      rows.map((row) =>
        within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent),
      ),
    ).toEqual([
      ['12 min ago', 'S · Red', 'Receipt', '+3', '8', 'Wanjiru Kamau'],
      [olderLabel, 'M · Blue', 'Sale', '-2', '5', 'Order #12'],
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(4));
    expect(
      within(table.getAllByRole('row')[3])
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual([olderLabel, '—', 'Adjustment', '-1', '4', '—']);
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
    expect(movementRequests).toEqual([
      '?product_id=1&per_page=25&page=1',
      '?product_id=1&per_page=25&page=2',
    ]);
  });

  it('shows an empty stock history', async () => {
    setUp();
    await waitForProduct();

    await userEvent.click(screen.getByRole('tab', { name: /^Stock history/ }));
    expect(await screen.findByText('No stock movements yet.')).toBeVisible();
    expect(screen.getByRole('tab', { name: /^Stock history/ })).toHaveTextContent('Stock history0');
  });

  it('hides stock history without inventory.view and opening stock without inventory.manage', async () => {
    const { requests, movementRequests } = setUp({
      user: buildUserWithout('inventory.view', 'inventory.manage'),
    });
    await waitForProduct();

    expect(screen.queryByRole('tab', { name: /^Stock history/ })).not.toBeInTheDocument();

    const dialog = await openAddVariant();
    expect(dialog.queryByRole('textbox', { name: 'Opening stock' })).not.toBeInTheDocument();
    await userEvent.selectOptions(dialog.getByRole('combobox', { name: 'Size' }), 'L');
    await userEvent.selectOptions(dialog.getByRole('combobox', { name: 'Colour' }), 'Red');
    await userEvent.click(dialog.getByRole('button', { name: 'Add variant' }));

    expect(await screen.findByText('Variant added')).toBeVisible();
    expect(requests.map(({ method, path }) => `${method} ${path}`)).toEqual([
      `POST ${productPath}/variants`,
    ]);
    expect(movementRequests).toEqual([]);
  });

  it('never sends a variant price without pricing.manage', async () => {
    const { requests } = setUp({ user: buildUserWithout('pricing.manage') });
    await waitForProduct();

    expect(screen.getByRole('textbox', { name: 'Price for S · Red' })).toBeDisabled();
    const dialog = await openAddVariant();
    expect(dialog.queryByRole('textbox', { name: 'Price' })).not.toBeInTheDocument();
    await userEvent.selectOptions(dialog.getByRole('combobox', { name: 'Size' }), 'L');
    await userEvent.selectOptions(dialog.getByRole('combobox', { name: 'Colour' }), 'Red');
    await userEvent.click(dialog.getByRole('button', { name: 'Add variant' }));

    expect(await screen.findByText('Variant added')).toBeVisible();
    expect(requests).toEqual([
      { method: 'POST', path: `${productPath}/variants`, body: { option_value_ids: [3, 11] } },
    ]);
  });
});
