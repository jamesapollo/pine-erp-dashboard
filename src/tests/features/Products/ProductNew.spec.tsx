import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type OptionType, type Product } from '@/types/catalogue';
import { customRenderAtRoute } from '@/tests/customRender';
import {
  buildCategoryFixture,
  buildOptionTypeFixture,
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

const createdProductId = 7;

function setUp({
  user = buildUserFixture(),
  optionTypes = [buildOptionTypeFixture()],
  createdProduct = buildProductFixture({ id: createdProductId, variants: [] }),
}: {
  user?: ReturnType<typeof buildUserFixture>;
  optionTypes?: OptionType[];
  createdProduct?: Product;
} = {}) {
  const requests: RecordedRequest[] = [];
  async function record(request: Request) {
    const path = new URL(request.url).pathname;
    let body: unknown = null;
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      // jsdom's File crosses into the runtime's multipart body with only its type intact (no name
      // or content, and the parser rejects it), so read the parts from the text.
      const raw = await request.text();
      body = {
        fileType: /name="file"; filename="[^"]*"\r\nContent-Type: ([^\r]*)/.exec(raw)?.[1],
        alt_text: /name="alt_text"\r\n\r\n([^\r]*)/.exec(raw)?.[1],
      };
    } else if (contentType.includes('application/json')) {
      body = await request.json();
    }
    requests.push({ method: request.method, path, body });
  }

  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.optionTypes, () => HttpResponse.json({ data: optionTypes })),
    http.get(mockEndpoints.categories, () => HttpResponse.json({ data: [buildCategoryFixture()] })),
    http.get(mockEndpoints.product, () => HttpResponse.json({ data: createdProduct })),
    http.post(mockEndpoints.products, async ({ request }) => {
      await record(request);
      return HttpResponse.json({ data: createdProduct }, { status: 201 });
    }),
    http.post(mockEndpoints.variants, async ({ request }) => {
      await record(request);
      const body = requests.at(-1)?.body as { option_value_ids: number[] };
      return HttpResponse.json(
        {
          data: buildVariantFixture({
            id: 100 + body.option_value_ids[0],
            product_id: createdProductId,
            is_default: false,
          }),
        },
        { status: 201 },
      );
    }),
    http.patch(mockEndpoints.variant, async ({ request }) => {
      await record(request);
      return HttpResponse.json({ data: buildVariantFixture() });
    }),
    http.post(mockEndpoints.stockAdjustments, async ({ request }) => {
      await record(request);
      return HttpResponse.json(
        { data: { movement: {}, stock: { on_hand: 3, reserved: 0, available: 3 } } },
        { status: 201 },
      );
    }),
    http.post(mockEndpoints.images, async ({ request }) => {
      await record(request);
      return HttpResponse.json({ data: {} }, { status: 201 });
    }),
    http.post(mockEndpoints.productPublish, async ({ request }) => {
      await record(request);
      return HttpResponse.json({ data: { ...createdProduct, status: 'published' } });
    }),
  );

  const rendered = customRenderAtRoute({ url: '/products/new' });
  return { ...rendered, requests };
}

async function waitForForm() {
  expect(await screen.findByRole('heading', { name: 'Add product' })).toBeVisible();
}

const productPath = `/api/v1/stores/1/products`;

describe('Add product', () => {
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  const originalStream = Blob.prototype.stream;

  beforeEach(() => {
    // jsdom has no object URLs (the image tiles only need a string) and its Blob can't be
    // streamed, which the multipart upload body needs.
    URL.createObjectURL = () => 'blob:preview';
    URL.revokeObjectURL = () => {};
    Blob.prototype.stream = function stream(this: Blob) {
      const read = this.arrayBuffer();
      return new ReadableStream({
        async start(controller) {
          controller.enqueue(new Uint8Array(await read));
          controller.close();
        },
      });
    };
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    Blob.prototype.stream = originalStream;
  });

  it('saves a draft with only a name', async () => {
    const { router, requests } = setUp({
      createdProduct: buildProductFixture({ id: createdProductId, price: null }),
    });
    await waitForForm();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/products/7'));
    expect(requests).toEqual([
      {
        method: 'POST',
        path: productPath,
        body: {
          title: 'Ankara wrap dress',
          description: null,
          category_ids: [],
          is_featured: false,
          option_type_ids: [],
        },
      },
    ]);
    expect(await screen.findByText('Draft saved')).toBeVisible();
  });

  it('publishes a product with options, per-variant prices and opening stock', async () => {
    const { router, requests } = setUp();
    await waitForForm();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Dresses');
    await userEvent.type(screen.getByRole('textbox', { name: 'Base price' }), '4500');
    await userEvent.click(await screen.findByRole('button', { name: 'Size' }));
    await userEvent.click(screen.getByRole('button', { name: 'S' }));
    await userEvent.click(screen.getByRole('button', { name: 'M' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Price for M' }), '5200');
    await userEvent.type(screen.getByRole('textbox', { name: 'Opening stock for S' }), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/products/7'));
    expect(requests).toEqual([
      {
        method: 'POST',
        path: productPath,
        body: {
          title: 'Ankara wrap dress',
          description: null,
          category_ids: [1],
          price: '4500.00',
          is_featured: false,
          option_type_ids: [1],
        },
      },
      { method: 'POST', path: `${productPath}/7/variants`, body: { option_value_ids: [1] } },
      {
        method: 'POST',
        path: `${productPath}/7/variants`,
        body: { option_value_ids: [2], price: '5200.00' },
      },
      {
        method: 'POST',
        path: '/api/v1/stores/1/stock-adjustments',
        body: { variant_id: 101, type: 'receipt', change: 3, reason: 'Opening stock' },
      },
      { method: 'POST', path: `${productPath}/7/publish`, body: null },
    ]);
    expect(await screen.findByText('Product published')).toBeVisible();
  });

  it('prices the default variant when the product has no options', async () => {
    const { router, requests } = setUp({
      createdProduct: buildProductFixture({
        id: createdProductId,
        variants: [buildVariantFixture({ id: 70 })],
      }),
    });
    await waitForForm();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    await userEvent.type(screen.getByRole('textbox', { name: 'Price for Default' }), '4800');
    await userEvent.type(screen.getByRole('textbox', { name: 'Opening stock for Default' }), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/products/7'));
    expect(requests.slice(1)).toEqual([
      { method: 'PATCH', path: `${productPath}/7/variants/70`, body: { price: '4800.00' } },
      {
        method: 'POST',
        path: '/api/v1/stores/1/stock-adjustments',
        body: { variant_id: 70, type: 'receipt', change: 2, reason: 'Opening stock' },
      },
    ]);
  });

  it('uploads picked images after the product is created', async () => {
    const { router, requests } = setUp();
    await waitForForm();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    await userEvent.upload(screen.getByLabelText('Upload images'), [
      new File(['front'], 'front.jpg', { type: 'image/jpeg' }),
      new File(['back'], 'back.png', { type: 'image/png' }),
    ]);
    expect(screen.getByText('Cover')).toBeVisible();
    expect(screen.getAllByRole('img')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/products/7'));
    expect(requests.filter((request) => request.path.endsWith('/images'))).toEqual([
      {
        method: 'POST',
        path: `${productPath}/7/images`,
        body: { fileType: 'image/jpeg', alt_text: 'Ankara wrap dress' },
      },
      {
        method: 'POST',
        path: `${productPath}/7/images`,
        body: { fileType: 'image/png', alt_text: 'Ankara wrap dress' },
      },
    ]);
  });

  it('rejects images that are not JPG, PNG or WebP', async () => {
    setUp();
    await waitForForm();

    await userEvent.upload(
      screen.getByLabelText('Upload images'),
      new File(['gif'], 'spin.gif', { type: 'image/gif' }),
      { applyAccept: false },
    );

    expect(screen.getByText('Use a JPG, PNG or WebP image up to 5 MB.')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('removes a picked image before saving', async () => {
    setUp();
    await waitForForm();

    await userEvent.upload(
      screen.getByLabelText('Upload images'),
      new File(['front'], 'front.jpg', { type: 'image/jpeg' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove front.jpg' }));

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('blocks publish until name, category and price are set', async () => {
    const { requests } = setUp();
    await waitForForm();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(await screen.findByText('Pick a category')).toBeVisible();
    expect(screen.getByText('Set a price above 0')).toBeVisible();
    expect(requests).toEqual([]);
  });

  it('asks for a name before saving a draft', async () => {
    const { requests } = setUp();
    await waitForForm();

    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText('Give the product a name')).toBeVisible();
    expect(requests).toEqual([]);
  });

  it('checks variant prices and stock before saving', async () => {
    const { requests } = setUp();
    await waitForForm();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    await userEvent.type(screen.getByRole('textbox', { name: 'Price for Default' }), '45.555');
    await userEvent.type(screen.getByRole('textbox', { name: 'Opening stock for Default' }), '1.5');
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText('Enter a price like 4500 or 4500.50')).toBeVisible();
    expect(screen.getByText('Enter a whole number of units')).toBeVisible();
    expect(requests).toEqual([]);
  });

  it('maps a create 422 onto the field', async () => {
    const { router } = setUp();
    server.use(
      http.post(mockEndpoints.products, () =>
        HttpResponse.json(
          {
            message: 'The title field must not be greater than 200 characters.',
            errors: { title: ['The title field must not be greater than 200 characters.'] },
          },
          { status: 422 },
        ),
      ),
    );
    await waitForForm();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
        'The title field must not be greater than 200 characters.',
      ),
    );
    expect(router.state.location.pathname).toBe('/products/new');
  });

  it('shows a create error that has no field as a page alert', async () => {
    setUp();
    server.use(
      http.post(mockEndpoints.products, () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 }),
      ),
    );
    await waitForForm();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText("You don't have permission to do that.")).toBeVisible();
  });

  it('lands on the saved draft with a message when a later step fails', async () => {
    const { router, requests } = setUp();
    let variantPosts = 0;
    server.use(
      http.post(mockEndpoints.variants, () => {
        variantPosts += 1;
        if (variantPosts === 2) {
          return HttpResponse.json(
            {
              message: 'A variant with these options already exists.',
              errors: { option_value_ids: ['A variant with these options already exists.'] },
            },
            { status: 422 },
          );
        }
        return HttpResponse.json(
          { data: buildVariantFixture({ id: 101, is_default: false }) },
          { status: 201 },
        );
      }),
    );
    await waitForForm();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    await userEvent.click(await screen.findByRole('button', { name: 'Size' }));
    await userEvent.click(screen.getByRole('button', { name: 'S' }));
    await userEvent.click(screen.getByRole('button', { name: 'M' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Opening stock for M' }), '4');
    await userEvent.upload(
      screen.getByLabelText('Upload images'),
      new File(['front'], 'front.jpg', { type: 'image/jpeg' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/products/7'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Saved as a draft, but 1 variant, opening stock for 1 variant and 1 image didn't save: A variant with these options already exists. Add them below.",
    );
    expect(variantPosts).toBe(2);
    expect(requests.map((request) => request.path)).toEqual([productPath]);
    expect(screen.queryByText('Draft saved')).not.toBeInTheDocument();

    // The message is for this visit only: it isn't kept in history for a reload or Back.
    await waitFor(() => expect(router.state.location.state).toBeNull());
    expect(router.state.location.pathname).toBe('/products/7');
    expect(screen.getByRole('alert')).toHaveTextContent('Saved as a draft, but 1 variant');
  });

  it('lands on the saved draft when publishing fails', async () => {
    const { router } = setUp({
      createdProduct: buildProductFixture({ id: createdProductId }),
    });
    server.use(
      http.post(mockEndpoints.productPublish, () =>
        HttpResponse.json(
          {
            message: 'A product needs at least one active variant to be published.',
            errors: { status: ['A product needs at least one active variant to be published.'] },
          },
          { status: 422 },
        ),
      ),
    );
    await waitForForm();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Dresses');
    await userEvent.type(screen.getByRole('textbox', { name: 'Base price' }), '4500');
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/products/7'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Saved as a draft, but it couldn't be published: A product needs at least one active variant to be published.",
    );
  });

  it('never sends a price without pricing.manage', async () => {
    const { router, requests } = setUp({ user: buildUserWithout('pricing.manage') });
    await waitForForm();

    const basePrice = screen.getByRole('textbox', { name: 'Base price' });
    expect(basePrice).toBeDisabled();
    expect(basePrice).toHaveAccessibleDescription("You can't set prices");
    expect(screen.getByRole('textbox', { name: 'Price for Default' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    await userEvent.click(await screen.findByRole('button', { name: 'Size' }));
    await userEvent.click(screen.getByRole('button', { name: 'S' }));
    expect(screen.getByRole('textbox', { name: 'Price for S' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/products/7'));
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      expect(request.body).not.toHaveProperty('price');
    }
  });

  it('hides opening stock without inventory.manage', async () => {
    const { router, requests } = setUp({ user: buildUserWithout('inventory.manage') });
    await waitForForm();

    expect(screen.queryByRole('columnheader', { name: 'Opening stock' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'Opening stock for Default' }),
    ).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/products/7'));
    expect(requests.some((request) => request.path.endsWith('stock-adjustments'))).toBe(false);
  });

  it('disables both save buttons while saving', async () => {
    const { router } = setUp();
    let productPosts = 0;
    let finishCreate: () => void = () => {};
    const created = new Promise<void>((resolve) => {
      finishCreate = resolve;
    });
    server.use(
      http.post(mockEndpoints.products, async () => {
        productPosts += 1;
        await created;
        return HttpResponse.json(
          { data: buildProductFixture({ id: createdProductId, variants: [] }) },
          { status: 201 },
        );
      }),
    );
    await waitForForm();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    const saveDraft = screen.getByRole('button', { name: 'Save draft' });
    await userEvent.click(saveDraft);

    await waitFor(() => expect(saveDraft).toBeDisabled());
    expect(saveDraft).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    await userEvent.click(saveDraft);
    finishCreate();

    await waitFor(() => expect(router.state.location.pathname).toBe('/products/7'));
    expect(productPosts).toBe(1);
  });

  it('asks before discarding typed changes', async () => {
    const { router } = setUp();
    await waitForForm();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));

    const dialog = await screen.findByRole('dialog', { name: 'Discard this product?' });
    expect(within(dialog).getByText("What you've entered will be lost.")).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ankara wrap dress');

    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard' }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'));
  });

  it('refreshes option type usage after adding a product with options', async () => {
    const { router } = setUp();
    let isSizeUsed = false;
    server.use(
      http.get(mockEndpoints.optionTypes, () =>
        HttpResponse.json({
          data: [buildOptionTypeFixture({ products_count: isSizeUsed ? 1 : 0 })],
        }),
      ),
      http.post(mockEndpoints.products, () => {
        isSizeUsed = true;
        return HttpResponse.json(
          { data: buildProductFixture({ id: createdProductId, variants: [] }) },
          { status: 201 },
        );
      }),
    );
    await waitForForm();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    await userEvent.click(await screen.findByRole('button', { name: 'Size' }));
    await userEvent.click(screen.getByRole('button', { name: 'S' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/products/7'));

    await router.navigate('/products/option-types');

    expect(await screen.findByText('Used by 1 product')).toBeVisible();
    expect(screen.queryByText('Not used by any product yet')).not.toBeInTheDocument();
  });

  it('asks for a value for each chosen option before saving', async () => {
    const { requests } = setUp();
    await waitForForm();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    await userEvent.click(await screen.findByRole('button', { name: 'Size' }));

    const saveDraft = screen.getByRole('button', { name: 'Save draft' });
    expect(saveDraft).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    await userEvent.click(saveDraft);

    expect(screen.getByText('Pick at least one value for each option.')).toBeVisible();
    expect(requests).toEqual([]);
  });

  it('asks before leaving with unsaved work', async () => {
    const { router } = setUp();
    await waitForForm();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    await userEvent.click(within(screen.getByRole('main')).getByRole('link', { name: 'Products' }));

    const dialog = await screen.findByRole('dialog', { name: 'Discard changes?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/products/new');
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ankara wrap dress');

    await userEvent.click(
      within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', {
        name: 'Products',
      }),
    );
    await userEvent.click(
      within(await screen.findByRole('dialog', { name: 'Discard changes?' })).getByRole('button', {
        name: 'Discard',
      }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'));
  });

  it('confirms Discard only once', async () => {
    const { router } = setUp();
    await waitForForm();

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ankara wrap dress');
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    await userEvent.click(
      within(await screen.findByRole('dialog', { name: 'Discard this product?' })).getByRole(
        'button',
        { name: 'Discard' },
      ),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe('/products'));
    expect(screen.queryByRole('dialog', { name: 'Discard changes?' })).not.toBeInTheDocument();
  });

  it('shows no permission for Add product without catalogue.manage', async () => {
    const { requests } = setUp({ user: buildUserWithout('catalogue.manage') });

    expect(await screen.findByText("You don't have permission to do that.")).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Add product' })).not.toBeInTheDocument();
    expect(requests).toEqual([]);
  });

  it('discards an untouched form without asking', async () => {
    const { router } = setUp();
    await waitForForm();

    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/products'));
  });
});
