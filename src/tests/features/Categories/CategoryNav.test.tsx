import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type Category } from '@/types/catalogue';
import { customRenderAtRoute } from '@/tests/customRender';
import { buildCategoryFixture } from '@/tests/fixtures/catalogue';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

const navCategories = [
  buildCategoryFixture({ id: 1, name: 'Dresses', show_in_nav: true, nav_order: 0 }),
  buildCategoryFixture({ id: 2, name: 'Tops', show_in_nav: true, nav_order: 1, sort_order: 1 }),
  buildCategoryFixture({ id: 3, name: 'Skirts', show_in_nav: true, nav_order: 2, sort_order: 2 }),
];
const notInNav = buildCategoryFixture({ id: 4, name: 'Shoes', sort_order: 3 });
const hidden = buildCategoryFixture({ id: 5, name: 'Archive', is_visible: false, sort_order: 4 });
const newIn = buildCategoryFixture({
  id: 6,
  name: 'New In',
  kind: 'new_in',
  sort_order: 5,
  show_in_nav: true,
  nav_order: 3,
});

function respondWith(categories: Category[], user = buildUserFixture()) {
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.categories, () => HttpResponse.json({ data: categories })),
  );
}

function recordNavSaves(response: (ids: number[]) => Category[] = () => []) {
  const bodies: unknown[] = [];
  server.use(
    http.put(mockEndpoints.categoryNav, async ({ request }) => {
      const body = (await request.json()) as { category_ids: number[] };
      bodies.push(body);
      return HttpResponse.json({ data: response(body.category_ids) });
    }),
  );
  return bodies;
}

async function findNavList() {
  return within(await screen.findByRole('region', { name: 'Category nav' })).findByRole('list', {
    name: 'Categories in the nav',
  });
}

function navNames(list: HTMLElement) {
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.querySelector('[data-nav-name]')?.textContent);
}

describe('Category nav panel', () => {
  it('lists nav categories by nav order', async () => {
    respondWith([navCategories[2], navCategories[0], navCategories[1], notInNav]);
    customRenderAtRoute({ url: '/products/categories' });

    expect(navNames(await findNavList())).toEqual(['Dresses', 'Tops', 'Skirts']);
    expect(screen.getByText(/Changes show on the website within about 5 minutes\./)).toBeVisible();
  });

  it('moves a category down and saves the new order', async () => {
    respondWith([...navCategories, notInNav]);
    const bodies = recordNavSaves();
    customRenderAtRoute({ url: '/products/categories' });

    const list = await findNavList();
    await userEvent.click(within(list).getByRole('button', { name: 'Move Dresses down' }));
    expect(navNames(list)).toEqual(['Tops', 'Dresses', 'Skirts']);
    await userEvent.click(screen.getByRole('button', { name: 'Save nav' }));

    await waitFor(() => expect(bodies).toEqual([{ category_ids: [2, 1, 3] }]));
    expect(await screen.findByText('Category nav saved')).toBeVisible();
  });

  it('offers only visible categories that are not already in the nav', async () => {
    respondWith([...navCategories, notInNav, hidden]);
    const bodies = recordNavSaves();
    customRenderAtRoute({ url: '/products/categories' });

    const picker = await screen.findByRole('combobox', { name: 'Add to nav' });
    const options = within(picker)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toEqual(['Choose…', 'Shoes']);

    await userEvent.selectOptions(picker, 'Shoes');
    expect(navNames(await findNavList())).toEqual(['Dresses', 'Tops', 'Skirts', 'Shoes']);
    await userEvent.click(screen.getByRole('button', { name: 'Save nav' }));
    await waitFor(() => expect(bodies).toEqual([{ category_ids: [1, 2, 3, 4] }]));
  });

  it('removes a category from the nav on save', async () => {
    respondWith([...navCategories, notInNav]);
    const bodies = recordNavSaves();
    customRenderAtRoute({ url: '/products/categories' });

    const list = await findNavList();
    await userEvent.click(within(list).getByRole('button', { name: 'Remove Tops from nav' }));
    expect(navNames(list)).toEqual(['Dresses', 'Skirts']);
    await userEvent.click(screen.getByRole('button', { name: 'Save nav' }));

    await waitFor(() => expect(bodies).toEqual([{ category_ids: [1, 3] }]));
  });

  it('allows saving an empty nav', async () => {
    respondWith([navCategories[0]]);
    const bodies = recordNavSaves();
    customRenderAtRoute({ url: '/products/categories' });

    const list = await findNavList();
    await userEvent.click(within(list).getByRole('button', { name: 'Remove Dresses from nav' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save nav' }));

    await waitFor(() => expect(bodies).toEqual([{ category_ids: [] }]));
  });

  it('discards unsaved changes on cancel', async () => {
    respondWith(navCategories);
    customRenderAtRoute({ url: '/products/categories' });

    const list = await findNavList();
    await userEvent.click(within(list).getByRole('button', { name: 'Remove Tops from nav' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(navNames(list)).toEqual(['Dresses', 'Tops', 'Skirts']);
    expect(screen.getByRole('button', { name: 'Save nav' })).toBeDisabled();
  });

  it('warns when more than 8 categories are in the nav', async () => {
    const nine = Array.from({ length: 9 }, (_, index) =>
      buildCategoryFixture({
        id: 10 + index,
        name: `Cat ${index}`,
        slug: `cat-${index}`,
        sort_order: index,
        show_in_nav: true,
        nav_order: index,
      }),
    );
    respondWith(nine);
    customRenderAtRoute({ url: '/products/categories' });

    await findNavList();
    expect(screen.getByText('More than 8 categories will make the row scroll')).toBeVisible();
  });

  it('does not warn at 8 categories', async () => {
    respondWith(
      Array.from({ length: 8 }, (_, index) =>
        buildCategoryFixture({
          id: 10 + index,
          name: `Cat ${index}`,
          slug: `cat-${index}`,
          sort_order: index,
          show_in_nav: true,
          nav_order: index,
        }),
      ),
    );
    customRenderAtRoute({ url: '/products/categories' });

    await findNavList();
    expect(screen.queryByText(/More than 8 categories/)).not.toBeInTheDocument();
  });

  it('shows the server message and keeps the draft when saving fails', async () => {
    respondWith(navCategories);
    server.use(
      http.put(mockEndpoints.categoryNav, () =>
        HttpResponse.json(
          { message: 'Invalid.', errors: { 'category_ids.0': ['That category is not allowed.'] } },
          { status: 422 },
        ),
      ),
    );
    customRenderAtRoute({ url: '/products/categories' });

    const list = await findNavList();
    await userEvent.click(within(list).getByRole('button', { name: 'Remove Tops from nav' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save nav' }));

    expect(await screen.findByText('That category is not allowed.')).toBeVisible();
    expect(navNames(list)).toEqual(['Dresses', 'Skirts']);
  });

  it('is hidden without catalogue.manage', async () => {
    const user = buildUserFixture();
    respondWith(navCategories, {
      ...user,
      memberships: [
        {
          ...user.memberships[0],
          permissions: user.memberships[0].permissions.filter(
            (slug) => slug !== 'catalogue.manage',
          ),
        },
      ],
    });
    customRenderAtRoute({ url: '/products/categories' });

    await screen.findByRole('list', { name: 'Categories' });
    expect(screen.queryByRole('region', { name: 'Category nav' })).not.toBeInTheDocument();
  });
});

describe('Special categories', () => {
  it('shows a badge and no delete, parent or subcategory controls', async () => {
    respondWith([...navCategories, newIn]);
    customRenderAtRoute({ url: '/products/categories' });

    await userEvent.click(
      within(await screen.findByRole('list', { name: 'Categories' })).getByRole('button', {
        name: 'New In',
      }),
    );

    expect(await screen.findByText('Automatic — New In')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Delete category' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Parent' })).not.toBeInTheDocument();
  });

  it('is excluded from the product editor category picker', async () => {
    server.use(
      http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })),
      http.get(mockEndpoints.optionTypes, () => HttpResponse.json({ data: [] })),
      http.get(mockEndpoints.categories, () =>
        HttpResponse.json({
          data: [navCategories[0], newIn, { ...newIn, id: 7, kind: 'on_sale', name: 'Sale' }],
        }),
      ),
    );
    customRenderAtRoute({ url: '/products/new' });

    const picker = await screen.findByRole('combobox', { name: 'Category' });
    await waitFor(() =>
      expect(within(picker).getByRole('option', { name: 'Dresses' })).toBeVisible(),
    );
    expect(within(picker).queryByRole('option', { name: 'New In' })).not.toBeInTheDocument();
    expect(within(picker).queryByRole('option', { name: 'Sale' })).not.toBeInTheDocument();
  });

  it('is excluded from the products list category filter', async () => {
    server.use(
      http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })),
      http.get(mockEndpoints.categories, () =>
        HttpResponse.json({ data: [navCategories[0], newIn] }),
      ),
      http.get(mockEndpoints.products, () =>
        HttpResponse.json({
          data: [],
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
          links: {},
        }),
      ),
    );
    customRenderAtRoute({ url: '/products' });

    const filter = await screen.findByRole('combobox', { name: 'Category' });
    await waitFor(() =>
      expect(within(filter).getByRole('option', { name: 'Dresses' })).toBeVisible(),
    );
    expect(within(filter).queryByRole('option', { name: 'New In' })).not.toBeInTheDocument();
  });
});
