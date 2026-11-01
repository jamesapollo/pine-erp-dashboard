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
    children: [buildCategoryFixture({ id: 2, parent_id: 1, name: 'Maxi' })],
  }),
  buildCategoryFixture({ id: 3, name: 'Tops', slug: 'tops', sort_order: 1 }),
];

function respondWithCategories() {
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })),
    http.get(mockEndpoints.categories, () => HttpResponse.json({ data: categories })),
  );
}

describe('Categories', () => {
  it('lists categories as an indented tree', async () => {
    respondWithCategories();
    customRenderAtRoute({ url: '/products/categories' });

    const tree = await screen.findByRole('list', { name: 'Categories' });
    const items = within(tree).getAllByRole('button');
    expect(items.map((item) => item.textContent)).toEqual(['Dresses', '  Maxi', 'Tops']);
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Dresses');
  });

  it('adds a category under a parent', async () => {
    respondWithCategories();
    let body: unknown;
    server.use(
      http.post(mockEndpoints.categories, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { data: buildCategoryFixture({ id: 9, name: 'Kitenge', parent_id: 1 }) },
          { status: 201 },
        );
      }),
    );
    customRenderAtRoute({ url: '/products/categories' });

    await userEvent.click(await screen.findByRole('button', { name: 'Add category' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Kitenge');
    await userEvent.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Parent' }),
      'Dresses',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(body).toEqual({ name: 'Kitenge', parent_id: 1 }));
    expect(await screen.findByText('Category added')).toBeVisible();
  });

  it("shows the API message when a category with subcategories can't be deleted", async () => {
    respondWithCategories();
    server.use(
      http.delete(mockEndpoints.category, () =>
        HttpResponse.json(
          {
            message: 'Invalid.',
            errors: { category: ["A category with subcategories can't be deleted."] },
          },
          { status: 422 },
        ),
      ),
    );
    customRenderAtRoute({ url: '/products/categories' });

    await userEvent.click(await screen.findByRole('button', { name: 'Delete category' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Dresses?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(
      await within(await screen.findByRole('dialog')).findByText(
        "A category with subcategories can't be deleted.",
      ),
    ).toBeVisible();
  });

  it('saves a renamed category and toggles visibility', async () => {
    respondWithCategories();
    const bodies: unknown[] = [];
    server.use(
      http.patch(mockEndpoints.category, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ data: categories[0] });
      }),
    );
    customRenderAtRoute({ url: '/products/categories' });

    const nameInput = await screen.findByRole('textbox', { name: 'Name' });
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Gowns');
    await userEvent.tab();
    await waitFor(() => expect(bodies).toEqual([{ name: 'Gowns' }]));
    expect(await screen.findByText('Category saved')).toBeVisible();

    await userEvent.click(screen.getByRole('switch', { name: 'Visible on storefront' }));
    await waitFor(() => expect(bodies[1]).toEqual({ is_visible: false }));
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

    expect(await screen.findByRole('textbox', { name: 'Name' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Add category' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete category' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Parent' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Visible on storefront' })).toBeDisabled();
  });
});
