import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { customRenderAtRoute } from '@/tests/customRender';
import { buildCategoryFixture } from '@/tests/fixtures/catalogue';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

const categories = [
  buildCategoryFixture({
    id: 1,
    name: 'Dresses',
    description: 'Every dress we stock.',
    children: [
      buildCategoryFixture({
        id: 2,
        parent_id: 1,
        name: 'Maxi',
        slug: 'maxi',
        children: [
          buildCategoryFixture({ id: 4, parent_id: 2, name: 'Linen maxi', slug: 'linen-maxi' }),
        ],
      }),
    ],
  }),
  buildCategoryFixture({ id: 3, name: 'Tops', slug: 'tops', sort_order: 1, is_visible: false }),
  buildCategoryFixture({ id: 5, name: 'New In', slug: 'new-in', sort_order: 2, kind: 'new_in' }),
];

function respondWithCategories() {
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })),
    http.get(mockEndpoints.categories, () => HttpResponse.json({ data: categories })),
  );
}

async function findTree() {
  return screen.findByRole('list', { name: 'Categories' });
}

async function selectCategory(name: string) {
  await userEvent.click(
    within(await findTree()).getByRole('button', { name: new RegExp(`^${name}`) }),
  );
}

describe('Categories', () => {
  it('lists the tree and shows the first category', async () => {
    respondWithCategories();
    customRenderAtRoute({ url: '/products/categories' });

    const tree = await findTree();
    const rows = within(tree).getAllByRole('button');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Dresses',
      'Maxi',
      'Linen maxi',
      'TopsHidden',
      'New InAutomatic',
    ]);
    expect(screen.getByText('5 categories')).toBeVisible();
    expect(rows[0]).toHaveAttribute('aria-current', 'true');

    expect(screen.getByRole('heading', { name: 'Dresses' })).toBeVisible();
    expect(screen.getByText('/dresses')).toBeVisible();
    expect(screen.getByText('Top level')).toBeVisible();
    expect(screen.getByText('Every dress we stock.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'View products' })).toHaveAttribute(
      'href',
      '/products?category=1',
    );
  });

  it('shows the selected category', async () => {
    respondWithCategories();
    customRenderAtRoute({ url: '/products/categories' });

    await selectCategory('Maxi');

    expect(screen.getByRole('heading', { name: 'Maxi' })).toBeVisible();
    expect(screen.getByText('/maxi')).toBeVisible();
    const parentFact = screen.getByText('Parent').parentElement as HTMLElement;
    expect(within(parentFact).getByText('Dresses')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Subcategory' })).toBeVisible();

    // The deepest level can't hold subcategories.
    await selectCategory('Linen maxi');
    expect(screen.queryByRole('button', { name: 'Subcategory' })).not.toBeInTheDocument();
  });

  it('creates a category with a slug, description and visibility', async () => {
    respondWithCategories();
    let body: unknown;
    server.use(
      http.post(mockEndpoints.categories, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { data: buildCategoryFixture({ id: 9, name: 'Kitenge', slug: 'kitenge' }) },
          { status: 201 },
        );
      }),
    );
    customRenderAtRoute({ url: '/products/categories' });

    await userEvent.click(await screen.findByRole('button', { name: 'New category' }));
    const dialog = await screen.findByRole('dialog', { name: 'New category' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Kitenge Wear');
    expect(within(dialog).getByText('Made from the name: kitenge-wear')).toBeVisible();
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Slug (optional)' }),
      'kitenge',
    );
    await userEvent.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Parent' }),
      'Dresses',
    );
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: /Description/ }),
      'Bold prints.',
    );
    await userEvent.click(within(dialog).getByRole('switch', { name: 'Visible on storefront' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(body).toEqual({
        name: 'Kitenge Wear',
        slug: 'kitenge',
        parent_id: 1,
        description: 'Bold prints.',
        is_visible: false,
      }),
    );
    expect(await screen.findByText('Category added')).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('leaves the slug to the API when it is empty and validates the name', async () => {
    respondWithCategories();
    let body: unknown;
    server.use(
      http.post(mockEndpoints.categories, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: buildCategoryFixture({ id: 9 }) }, { status: 201 });
      }),
    );
    customRenderAtRoute({ url: '/products/categories' });

    await userEvent.click(await screen.findByRole('button', { name: 'New category' }));
    const dialog = await screen.findByRole('dialog', { name: 'New category' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(await within(dialog).findByText('Name the category.')).toBeVisible();

    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Shoes');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    await waitFor(() =>
      expect(body).toEqual({ name: 'Shoes', parent_id: null, description: null, is_visible: true }),
    );
  });

  it('offers only parents that keep the tree within three levels', async () => {
    respondWithCategories();
    customRenderAtRoute({ url: '/products/categories' });

    await userEvent.click(await screen.findByRole('button', { name: 'New category' }));
    const dialog = await screen.findByRole('dialog', { name: 'New category' });
    const options = within(within(dialog).getByRole('combobox', { name: 'Parent' }))
      .getAllByRole('option')
      .map((option) => option.textContent?.trim());
    expect(options).toEqual(['Top level', 'Dresses', 'Maxi', 'Tops']);
  });

  it('adds a subcategory under the selected category', async () => {
    respondWithCategories();
    customRenderAtRoute({ url: '/products/categories' });

    await selectCategory('Tops');
    await userEvent.click(screen.getByRole('button', { name: 'Subcategory' }));
    const dialog = await screen.findByRole('dialog', { name: 'New category' });
    expect(within(dialog).getByRole('combobox', { name: 'Parent' })).toHaveValue('3');
  });

  it('shows a slug the API rejects next to the field', async () => {
    respondWithCategories();
    server.use(
      http.post(mockEndpoints.categories, () =>
        HttpResponse.json(
          { message: 'Invalid.', errors: { slug: ['This slug is already in use.'] } },
          { status: 422 },
        ),
      ),
    );
    customRenderAtRoute({ url: '/products/categories' });

    await userEvent.click(await screen.findByRole('button', { name: 'New category' }));
    const dialog = await screen.findByRole('dialog', { name: 'New category' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Dresses');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    expect(await within(dialog).findByText('This slug is already in use.')).toBeVisible();
    expect(screen.getByRole('dialog', { name: 'New category' })).toBeVisible();
  });

  it('edits a category, sending only what changed', async () => {
    respondWithCategories();
    let body: unknown;
    server.use(
      http.patch(mockEndpoints.category, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: { ...categories[0], name: 'Gowns' } });
      }),
    );
    customRenderAtRoute({ url: '/products/categories' });

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit category' });
    expect(within(dialog).getByRole('textbox', { name: 'Slug' })).toHaveValue('dresses');
    const nameInput = within(dialog).getByRole('textbox', { name: 'Name' });
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Gowns');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(body).toEqual({ name: 'Gowns' }));
    expect(await screen.findByText('Category saved')).toBeVisible();
  });

  it('requires a slug on a saved category', async () => {
    respondWithCategories();
    customRenderAtRoute({ url: '/products/categories' });

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit category' });
    await userEvent.clear(within(dialog).getByRole('textbox', { name: 'Slug' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('Give the category a slug.')).toBeVisible();
  });

  it('toggles storefront visibility from the detail card', async () => {
    respondWithCategories();
    let body: unknown;
    server.use(
      http.patch(mockEndpoints.category, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: categories[0] });
      }),
    );
    customRenderAtRoute({ url: '/products/categories' });

    await userEvent.click(await screen.findByRole('switch', { name: 'Visible on storefront' }));
    await waitFor(() => expect(body).toEqual({ is_visible: false }));
  });

  it('deletes a category without subcategories', async () => {
    respondWithCategories();
    let isDeleted = false;
    server.use(
      http.delete(mockEndpoints.category, () => {
        isDeleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    customRenderAtRoute({ url: '/products/categories' });

    await selectCategory('Tops');
    await userEvent.click(screen.getByRole('button', { name: 'Delete category' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Tops?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(isDeleted).toBe(true));
    expect(await screen.findByText('Category deleted')).toBeVisible();
  });

  it("explains that a category with subcategories can't be deleted", async () => {
    respondWithCategories();
    customRenderAtRoute({ url: '/products/categories' });

    await userEvent.click(await screen.findByRole('button', { name: 'Delete category' }));
    const dialog = await screen.findByRole('dialog', { name: "Can't delete Dresses" });
    expect(within(dialog).getByText('Delete or move its subcategory first.')).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: 'OK' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an automatic category without delete or product links', async () => {
    respondWithCategories();
    customRenderAtRoute({ url: '/products/categories' });

    await selectCategory('New In');

    expect(screen.getByText('Automatic — New In')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Delete category' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View products' })).not.toBeInTheDocument();
  });

  it('is read-only without catalogue.manage', async () => {
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
      http.get(mockEndpoints.categories, () => HttpResponse.json({ data: categories })),
    );
    customRenderAtRoute({ url: '/products/categories' });

    expect(await screen.findByRole('switch', { name: 'Visible on storefront' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'New category' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete category' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subcategory' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View products' })).toBeVisible();
  });
});
