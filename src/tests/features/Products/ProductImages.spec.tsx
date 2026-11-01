import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type Product } from '@/types/catalogue';
import { customRenderAtRoute } from '@/tests/customRender';
import {
  buildCategoryFixture,
  buildProductFixture,
  buildProductImageFixture,
} from '@/tests/fixtures/catalogue';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

type RecordedRequest = { method: string; path: string; body: unknown };

const imagesPath = '/api/v1/stores/1/products/1/images';

function buildImages() {
  return [
    buildProductImageFixture({ id: 1, alt_text: 'Front', sort_order: 0, is_main: true }),
    buildProductImageFixture({ id: 2, alt_text: 'Back', sort_order: 1, is_main: false }),
    buildProductImageFixture({ id: 3, alt_text: 'Side', sort_order: 2, is_main: false }),
  ];
}

function setUp({
  user = buildUserFixture(),
  product = buildProductFixture({ category_ids: [1], images: buildImages() }),
  uploadResponse,
}: {
  user?: ReturnType<typeof buildUserFixture>;
  product?: Product;
  uploadResponse?: () => Response;
} = {}) {
  const requests: RecordedRequest[] = [];
  let current = product;
  let nextImageId = 50;

  async function record(request: Request) {
    const path = new URL(request.url).pathname;
    const contentType = request.headers.get('content-type') ?? '';
    let body: unknown = null;
    if (contentType.includes('multipart/form-data')) {
      // jsdom's File crosses into the runtime's multipart body with only its type intact, so read
      // the parts from the text.
      const raw = await request.text();
      body = {
        fileType: /name="file"; filename="[^"]*"\r\nContent-Type: ([^\r]*)/.exec(raw)?.[1],
        alt_text: /name="alt_text"\r\n\r\n([^\r]*)/.exec(raw)?.[1],
      };
    } else if (contentType.includes('application/json')) {
      body = await request.json();
    }
    requests.push({ method: request.method, path, body });
    return body;
  }

  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.categories, () => HttpResponse.json({ data: [buildCategoryFixture()] })),
    http.get(mockEndpoints.product, () => HttpResponse.json({ data: current })),
    http.post(mockEndpoints.images, async ({ request }) => {
      await record(request);
      if (uploadResponse) return uploadResponse();
      const image = buildProductImageFixture({
        id: nextImageId++,
        sort_order: current.images.length,
        is_main: false,
      });
      current = { ...current, images: [...current.images, image] };
      return HttpResponse.json({ data: image }, { status: 201 });
    }),
    http.put(mockEndpoints.imagesOrder, async ({ request }) => {
      const body = (await record(request)) as { image_ids: number[] };
      current = {
        ...current,
        images: body.image_ids.map((id, index) => ({
          ...(current.images.find((image) => image.id === id) as Product['images'][number]),
          sort_order: index,
        })),
      };
      return HttpResponse.json({ data: current.images });
    }),
    http.post(mockEndpoints.imageMain, async ({ request, params }) => {
      await record(request);
      current = {
        ...current,
        images: current.images.map((image) => ({
          ...image,
          is_main: image.id === Number(params.imageId),
        })),
      };
      return HttpResponse.json({
        data: current.images.find((image) => image.id === Number(params.imageId)),
      });
    }),
    http.delete(mockEndpoints.image, async ({ request, params }) => {
      await record(request);
      current = {
        ...current,
        images: current.images.filter((image) => image.id !== Number(params.imageId)),
      };
      return new HttpResponse(null, { status: 204 });
    }),
  );

  const rendered = customRenderAtRoute({ url: '/products/1' });
  return { ...rendered, requests };
}

async function waitForImagesCard() {
  const heading = await screen.findByRole('heading', { level: 3, name: 'Images' });
  const card = heading.closest('section');
  if (!card) throw new Error('No Images card');
  return within(card);
}

function getTile(card: ReturnType<typeof within>, altText: string) {
  const tile = card.getByAltText(altText).parentElement;
  if (!tile) throw new Error(`No tile for ${altText}`);
  return within(tile);
}

describe('Product images', () => {
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalStream = Blob.prototype.stream;

  beforeEach(() => {
    // jsdom's Blob can't be streamed, which the multipart upload body needs.
    URL.createObjectURL = () => 'blob:preview';
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
    Blob.prototype.stream = originalStream;
  });

  it('uploads images with the product name as alt text', async () => {
    const { requests } = setUp();
    const card = await waitForImagesCard();

    await userEvent.upload(card.getByLabelText('Upload images'), [
      new File(['front'], 'front.jpg', { type: 'image/jpeg' }),
      new File(['back'], 'back.png', { type: 'image/png' }),
    ]);

    expect(await screen.findByText('Images uploaded')).toBeVisible();
    expect(screen.getByText('2 images')).toBeVisible();
    expect(requests).toEqual([
      {
        method: 'POST',
        path: imagesPath,
        body: { fileType: 'image/jpeg', alt_text: 'Ankara wrap dress' },
      },
      {
        method: 'POST',
        path: imagesPath,
        body: { fileType: 'image/png', alt_text: 'Ankara wrap dress' },
      },
    ]);
  });

  it('rejects a file that is too large or the wrong type', async () => {
    const { requests } = setUp();
    const card = await waitForImagesCard();
    const input = card.getByLabelText('Upload images');

    await userEvent.upload(input, new File(['gif'], 'spin.gif', { type: 'image/gif' }), {
      applyAccept: false,
    });
    expect(card.getByText('Use a JPG, PNG or WebP image up to 5 MB.')).toBeVisible();

    await userEvent.upload(
      input,
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'huge.jpg', { type: 'image/jpeg' }),
    );
    expect(card.getByText('Use a JPG, PNG or WebP image up to 5 MB.')).toBeVisible();
    expect(requests).toEqual([]);
  });

  it('rejects a pick that does not fit in the remaining room', async () => {
    const images = Array.from({ length: 19 }, (_, index) =>
      buildProductImageFixture({
        id: index + 1,
        alt_text: `Image ${index + 1}`,
        sort_order: index,
      }),
    );
    const { requests } = setUp({
      product: buildProductFixture({ category_ids: [1], images }),
    });
    const card = await waitForImagesCard();

    await userEvent.upload(card.getByLabelText('Upload images'), [
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
    ]);

    expect(card.getByText('A product can have at most 20 images.')).toBeVisible();
    expect(requests).toEqual([]);
  });

  it('sets an image as the cover', async () => {
    const { requests } = setUp();
    const card = await waitForImagesCard();
    expect(getTile(card, 'Back').queryByText('Cover')).not.toBeInTheDocument();
    expect(getTile(card, 'Front').queryByRole('button', { name: 'Set as cover' })).toBeNull();

    await userEvent.click(getTile(card, 'Back').getByRole('button', { name: 'Set as cover' }));

    await waitFor(() => {
      expect(getTile(card, 'Back').getByText('Cover')).toBeVisible();
    });
    expect(getTile(card, 'Front').queryByText('Cover')).not.toBeInTheDocument();
    expect(requests).toEqual([{ method: 'POST', path: `${imagesPath}/2/main`, body: null }]);
  });

  it('moves an image left', async () => {
    const { requests } = setUp();
    const card = await waitForImagesCard();
    expect(getTile(card, 'Front').getByRole('button', { name: 'Move left' })).toBeDisabled();
    expect(getTile(card, 'Side').getByRole('button', { name: 'Move right' })).toBeDisabled();

    await userEvent.click(getTile(card, 'Back').getByRole('button', { name: 'Move left' }));

    await waitFor(() => {
      expect(card.getAllByRole('img').map((image) => image.getAttribute('alt'))).toEqual([
        'Back',
        'Front',
        'Side',
      ]);
    });
    expect(requests).toEqual([
      { method: 'PUT', path: `${imagesPath}/order`, body: { image_ids: [2, 1, 3] } },
    ]);
  });

  it('deletes an image after confirming', async () => {
    const { requests } = setUp();
    const card = await waitForImagesCard();

    await userEvent.click(getTile(card, 'Back').getByRole('button', { name: 'Delete image' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete this image?' });
    expect(within(dialog).getByText("It's removed from the product straight away.")).toBeVisible();
    expect(requests).toEqual([]);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(card.queryByAltText('Back')).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(requests).toEqual([{ method: 'DELETE', path: `${imagesPath}/2`, body: null }]);
  });

  it('keeps the image when the delete is cancelled', async () => {
    const { requests } = setUp();
    const card = await waitForImagesCard();

    await userEvent.click(getTile(card, 'Back').getByRole('button', { name: 'Delete image' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete this image?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(card.getByAltText('Back')).toBeVisible();
    expect(requests).toEqual([]);
  });

  it('shows the API message when an upload is refused', async () => {
    setUp({
      uploadResponse: () =>
        HttpResponse.json(
          {
            message: 'The given data was invalid.',
            errors: { images: ['A product can have at most 20 images.'] },
          },
          { status: 422 },
        ),
    });
    const card = await waitForImagesCard();

    await userEvent.upload(
      card.getByLabelText('Upload images'),
      new File(['front'], 'front.jpg', { type: 'image/jpeg' }),
    );

    expect(await card.findByRole('alert')).toHaveTextContent(
      'A product can have at most 20 images.',
    );
    expect(screen.queryByText('Images uploaded')).not.toBeInTheDocument();
  });

  it('has no image actions on an archived product', async () => {
    setUp({
      product: buildProductFixture({
        category_ids: [1],
        status: 'archived',
        images: buildImages(),
      }),
    });
    const card = await waitForImagesCard();

    expect(card.getByAltText('Front')).toBeVisible();
    expect(card.queryByRole('button')).toBeNull();
    expect(card.queryByLabelText('Upload images')).toBeNull();
  });

  it('has no image actions without the catalogue.manage permission', async () => {
    const user = buildUserFixture();
    setUp({
      user: {
        ...user,
        memberships: [
          {
            ...user.memberships[0],
            permissions: user.memberships[0].permissions.filter(
              (slug) => slug !== 'catalogue.manage',
            ),
          },
        ],
      },
    });
    const card = await waitForImagesCard();

    expect(card.getByAltText('Front')).toBeVisible();
    expect(card.queryByRole('button')).toBeNull();
  });

  it('says there are no images yet when a read-only product has none', async () => {
    setUp({
      product: buildProductFixture({ category_ids: [1], status: 'archived', images: [] }),
    });
    const card = await waitForImagesCard();

    expect(card.getByText('No images yet')).toBeVisible();
  });
});
