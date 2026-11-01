import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type OptionType } from '@/types/catalogue';
import { customRenderAtRoute } from '@/tests/customRender';
import { buildOptionTypeFixture } from '@/tests/fixtures/catalogue';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

function respondWithOptionTypes(optionTypes: OptionType[]) {
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })),
    http.get(mockEndpoints.optionTypes, () => HttpResponse.json({ data: optionTypes })),
  );
}

function sizeWithValue(index: number, overrides: Record<string, unknown>) {
  const optionType = buildOptionTypeFixture();
  optionType.values[index] = { ...optionType.values[index], ...overrides };
  return optionType;
}

describe('Option types', () => {
  it('adds an option type and selects it', async () => {
    const created = buildOptionTypeFixture({ id: 2, name: 'Colour', values: [] });
    let optionTypes = [buildOptionTypeFixture()];
    respondWithOptionTypes(optionTypes);
    let body: unknown;
    server.use(
      http.get(mockEndpoints.optionTypes, () => HttpResponse.json({ data: optionTypes })),
      http.post(mockEndpoints.optionTypes, async ({ request }) => {
        body = await request.json();
        optionTypes = [...optionTypes, created];
        return HttpResponse.json({ data: created }, { status: 201 });
      }),
    );
    customRenderAtRoute({ url: '/products/option-types' });

    await userEvent.click(await screen.findByRole('button', { name: 'Add option type' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Colour');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(body).toEqual({ name: 'Colour' }));
    expect(await screen.findByText('Option type added')).toBeVisible();
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Colour'),
    );
    expect(screen.getByText('No values yet')).toBeVisible();
  });

  it('adds, renames and deletes an unused value', async () => {
    respondWithOptionTypes([buildOptionTypeFixture()]);
    let createBody: unknown;
    let renameBody: unknown;
    let deletedId: string | readonly string[] | undefined;
    server.use(
      http.post(mockEndpoints.optionValues, async ({ request }) => {
        createBody = await request.json();
        return HttpResponse.json({ data: {} }, { status: 201 });
      }),
      http.patch(mockEndpoints.optionValue, async ({ request }) => {
        renameBody = await request.json();
        return HttpResponse.json({ data: {} });
      }),
      http.delete(mockEndpoints.optionValue, ({ params }) => {
        deletedId = params.optionValueId;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    customRenderAtRoute({ url: '/products/option-types' });

    await userEvent.type(await screen.findByRole('textbox', { name: 'New size value' }), 'XL');
    await userEvent.click(screen.getByRole('button', { name: 'Add value' }));
    await waitFor(() => expect(createBody).toEqual({ value: 'XL', sort_order: 3 }));
    expect(await screen.findByText('Value added')).toBeVisible();

    const mediumRow = screen.getByText('M').closest('li') as HTMLElement;
    await userEvent.click(within(mediumRow).getByRole('button', { name: 'Rename' }));
    const input = screen.getByRole('textbox', { name: 'Rename M' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Medium{Enter}');
    await waitFor(() => expect(renameBody).toEqual({ value: 'Medium' }));

    const smallRow = screen.getByText('S').closest('li') as HTMLElement;
    await userEvent.click(within(smallRow).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deletedId).toBe('1'));
    expect(await screen.findByText('Value deleted')).toBeVisible();
  });

  it('retires a value used by variants instead of deleting it', async () => {
    let optionTypes = [sizeWithValue(0, { variants_count: 2 })];
    respondWithOptionTypes(optionTypes);
    let body: unknown;
    server.use(
      http.get(mockEndpoints.optionTypes, () => HttpResponse.json({ data: optionTypes })),
      http.patch(mockEndpoints.optionValue, async ({ request }) => {
        body = await request.json();
        optionTypes = [sizeWithValue(0, { variants_count: 2, is_active: false })];
        return HttpResponse.json({ data: {} });
      }),
    );
    customRenderAtRoute({ url: '/products/option-types' });

    expect(await screen.findByText('2 variants')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Retire — hide from new products' }));

    await waitFor(() => expect(body).toEqual({ is_active: false }));
    expect(await screen.findByText('Retired')).toBeVisible();
    expect(await screen.findByText('S · existing variants keep selling')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Restore' })).toBeVisible();
  });

  it('reorders values', async () => {
    respondWithOptionTypes([buildOptionTypeFixture()]);
    const patches: { id: string | readonly string[] | undefined; body: unknown }[] = [];
    server.use(
      http.patch(mockEndpoints.optionValue, async ({ request, params }) => {
        patches.push({ id: params.optionValueId, body: await request.json() });
        return HttpResponse.json({ data: {} });
      }),
    );
    customRenderAtRoute({ url: '/products/option-types' });

    const smallRow = (await screen.findByText('S')).closest('li') as HTMLElement;
    expect(within(smallRow).getByRole('button', { name: 'Move up' })).toBeDisabled();
    await userEvent.click(within(smallRow).getByRole('button', { name: 'Move down' }));

    await waitFor(() => expect(patches).toHaveLength(2));
    expect(patches).toContainEqual({ id: '1', body: { sort_order: 1 } });
    expect(patches).toContainEqual({ id: '2', body: { sort_order: 0 } });
  });

  it('only allows deleting an unused type', async () => {
    respondWithOptionTypes([buildOptionTypeFixture({ products_count: 1 })]);
    customRenderAtRoute({ url: '/products/option-types' });

    expect(await screen.findByText('Used by 1 product')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Delete type' })).toBeDisabled();
  });

  it('deletes an unused type after confirming', async () => {
    respondWithOptionTypes([buildOptionTypeFixture()]);
    let wasDeleted = false;
    server.use(
      http.delete(mockEndpoints.optionType, () => {
        wasDeleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    customRenderAtRoute({ url: '/products/option-types' });

    expect(await screen.findByText('Not used by any product yet')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Delete type' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Size?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(wasDeleted).toBe(true));
    expect(await screen.findByText('Option type deleted')).toBeVisible();
  });

  it('blocks a duplicate value name inline', async () => {
    respondWithOptionTypes([buildOptionTypeFixture()]);
    customRenderAtRoute({ url: '/products/option-types' });

    await userEvent.type(await screen.findByRole('textbox', { name: 'New size value' }), ' m ');

    expect(screen.getByText('Already exists')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add value' })).toBeDisabled();
  });

  it('is read-only without catalogue.manage', async () => {
    const [membership] = buildUserFixture().memberships;
    server.use(
      http.get(mockEndpoints.me, () =>
        HttpResponse.json({
          data: buildUserFixture({
            memberships: [{ ...membership, permissions: ['catalogue.view'] }],
          }),
        }),
      ),
      http.get(mockEndpoints.optionTypes, () =>
        HttpResponse.json({ data: [buildOptionTypeFixture()] }),
      ),
    );
    customRenderAtRoute({ url: '/products/option-types' });

    expect(await screen.findByRole('textbox', { name: 'Name' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Add option type' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add value' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete type' })).not.toBeInTheDocument();
  });
});
