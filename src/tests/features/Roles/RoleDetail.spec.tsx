import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type RoleDetail } from '@/types/staff';
import { customRenderAtRoute } from '@/tests/customRender';
import { buildPermissionFixture, buildRoleDetailFixture } from '@/tests/fixtures/staff';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

const permissionDescriptions: Record<string, string> = {
  'catalogue.view': 'View the catalogue',
  'catalogue.manage': 'Manage the catalogue',
  'pricing.view': 'View pricing',
  'pricing.manage': 'Manage pricing',
  'inventory.view': 'View stock',
  'inventory.manage': 'Manage stock',
  'orders.view': 'View orders',
  'orders.manage': 'Manage orders',
  'fulfilment.manage': 'Manage deliveries',
  'store.view': 'View the store',
};

const packerRole = buildRoleDetailFixture({
  id: 5,
  name: 'Packer',
  slug: 'packer',
  description: 'Packs orders.',
  is_system: false,
  permissions: ['store.view'],
  member_count: 0,
  members: [],
});

function respondWithRole(role: RoleDetail) {
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })),
    http.get(mockEndpoints.role, () => HttpResponse.json({ data: role })),
    http.get(mockEndpoints.permissions, () =>
      HttpResponse.json({
        data: Object.entries(permissionDescriptions).map(([slug, description]) =>
          buildPermissionFixture({ slug, description }),
        ),
      }),
    ),
  );
}

async function findPermissionCheckbox(name: string) {
  return screen.findByRole('checkbox', { name });
}

describe('Role editor', () => {
  it('ticks the view permission when a manage one is ticked', async () => {
    respondWithRole(packerRole);
    customRenderAtRoute({ url: '/roles/5' });

    await userEvent.click(await findPermissionCheckbox('Manage the catalogue'));

    expect(screen.getByRole('checkbox', { name: 'View the catalogue' })).toBeChecked();
    expect(screen.queryByText('store.view')).not.toBeInTheDocument();
  });

  it('selects and clears a whole group', async () => {
    respondWithRole(packerRole);
    customRenderAtRoute({ url: '/roles/5' });

    await findPermissionCheckbox('View orders');
    const ordersCard = screen.getByRole('heading', { name: 'Orders' }).closest('section')!;
    expect(within(ordersCard).getByText('0 of 3')).toBeVisible();
    await userEvent.click(within(ordersCard).getByRole('button', { name: 'Select all' }));
    expect(within(ordersCard).getByText('3 of 3')).toBeVisible();
    await userEvent.click(within(ordersCard).getByRole('button', { name: 'Clear all' }));
    expect(within(ordersCard).getByText('0 of 3')).toBeVisible();
  });

  it('saves the chosen permissions', async () => {
    respondWithRole(packerRole);
    let body: unknown;
    server.use(
      http.patch(mockEndpoints.role, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          data: {
            ...packerRole,
            permissions: ['store.view', 'catalogue.view', 'catalogue.manage'],
          },
        });
      }),
    );
    customRenderAtRoute({ url: '/roles/5' });

    await userEvent.click(await findPermissionCheckbox('Manage the catalogue'));
    await userEvent.click(screen.getByRole('button', { name: 'Save role' }));

    expect(await screen.findByText('Role saved')).toBeVisible();
    expect(body).toEqual({
      name: 'Packer',
      description: 'Packs orders.',
      permissions: ['catalogue.view', 'catalogue.manage'],
    });
  });

  it('shows the API message when the permissions are refused', async () => {
    respondWithRole(packerRole);
    server.use(
      http.patch(mockEndpoints.role, () =>
        HttpResponse.json(
          { message: 'Invalid.', errors: { permissions: ['Manage needs View.'] } },
          { status: 422 },
        ),
      ),
    );
    customRenderAtRoute({ url: '/roles/5' });

    await userEvent.click(await findPermissionCheckbox('View orders'));
    await userEvent.click(screen.getByRole('button', { name: 'Save role' }));

    expect(await screen.findByText('Manage needs View.')).toBeVisible();
  });

  it('shows a built-in role read-only', async () => {
    respondWithRole(buildRoleDetailFixture({ permissions: ['store.view', 'catalogue.view'] }));
    customRenderAtRoute({ url: '/roles/2' });

    expect(await findPermissionCheckbox('View the catalogue')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'View the catalogue' })).toBeChecked();
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeDisabled();
    expect(
      screen.getByText(
        "Built-in roles can't be changed. Create a custom role to choose permissions.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Save role' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete role' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Select all' })).not.toBeInTheDocument();
  });

  it('lists the members and links to them', async () => {
    respondWithRole({ ...packerRole, member_count: 1, members: buildRoleDetailFixture().members });
    const { router } = customRenderAtRoute({ url: '/roles/5' });

    await userEvent.click(await screen.findByRole('link', { name: 'Brian Mwangi' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/staff/11'));
  });

  it('keeps Delete off while people hold the role', async () => {
    respondWithRole({ ...packerRole, member_count: 1, members: buildRoleDetailFixture().members });
    customRenderAtRoute({ url: '/roles/5' });

    expect(await screen.findByRole('button', { name: 'Delete role' })).toBeDisabled();
    expect(screen.getByText('Move its member to another role before deleting.')).toBeVisible();
  });

  it('deletes an empty role and returns to the list', async () => {
    respondWithRole(packerRole);
    server.use(http.delete(mockEndpoints.role, () => new HttpResponse(null, { status: 204 })));
    const { router } = customRenderAtRoute({ url: '/roles/5' });

    await userEvent.click(await screen.findByRole('button', { name: 'Delete role' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Packer?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete role' }));

    expect(await screen.findByText('Role deleted')).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe('/roles'));
  });

  it('refuses to delete a role people hold', async () => {
    respondWithRole(packerRole);
    server.use(
      http.delete(mockEndpoints.role, () =>
        HttpResponse.json(
          {
            message: "Move this role's members to another role before deleting it.",
            errors: { role: ["Move this role's members to another role before deleting it."] },
          },
          { status: 422 },
        ),
      ),
    );
    const { router } = customRenderAtRoute({ url: '/roles/5' });

    await userEvent.click(await screen.findByRole('button', { name: 'Delete role' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Packer?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete role' }));

    expect(
      await within(dialog).findByText(
        "Move this role's members to another role before deleting it.",
      ),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe('/roles/5');
  });

  it('asks before leaving with unsaved changes', async () => {
    respondWithRole(packerRole);
    const { router } = customRenderAtRoute({ url: '/roles/5' });

    await userEvent.click(await findPermissionCheckbox('View orders'));
    await userEvent.click(within(screen.getByRole('main')).getByRole('link', { name: 'Roles' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Discard changes?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/roles'));
  });

  it('shows the role name in the breadcrumb', async () => {
    respondWithRole(packerRole);
    customRenderAtRoute({ url: '/roles/5' });

    const breadcrumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(await within(breadcrumb).findByText('Packer')).toBeVisible();
  });

  it('shows the not-found page for a missing role', async () => {
    respondWithRole(packerRole);
    server.use(
      http.get(mockEndpoints.role, () =>
        HttpResponse.json({ message: 'Not found.' }, { status: 404 }),
      ),
    );
    customRenderAtRoute({ url: '/roles/99' });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  it('shows the not-found page for a non-numeric id', async () => {
    respondWithRole(packerRole);
    customRenderAtRoute({ url: '/roles/abc' });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});
