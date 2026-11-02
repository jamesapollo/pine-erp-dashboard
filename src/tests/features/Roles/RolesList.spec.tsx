import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { customRenderAtRoute } from '@/tests/customRender';
import {
  buildRoleDetailFixture,
  buildRoleFixture,
  buildStaffMemberFixture,
} from '@/tests/fixtures/staff';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

const ownerRole = buildRoleFixture({
  id: 1,
  name: 'Owner',
  slug: 'owner',
  description: 'Full access.',
  permissions: ['store.view', 'staff.manage', 'catalogue.view'],
  member_count: 1,
});
const managerRole = buildRoleFixture({
  id: 2,
  permissions: [
    'store.view',
    'catalogue.view',
    'catalogue.manage',
    'pricing.view',
    'inventory.view',
    'orders.view',
    'orders.manage',
  ],
  member_count: 2,
});
const packerRole = buildRoleFixture({
  id: 5,
  name: 'Packer',
  slug: 'packer',
  description: null,
  is_system: false,
  permissions: [],
  member_count: 0,
});

function respondWithRoles({ permissions }: { permissions?: string[] } = {}) {
  const user = buildUserFixture();
  if (permissions) user.memberships[0].permissions = permissions;
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.roles, () =>
      HttpResponse.json({ data: [ownerRole, managerRole, packerRole] }),
    ),
    http.get(mockEndpoints.staff, () =>
      HttpResponse.json({
        data: [
          buildStaffMemberFixture({
            id: 10,
            name: 'Wanjiru Kamau',
            role: { id: 1, name: 'Owner', slug: 'owner', is_system: true },
          }),
          buildStaffMemberFixture({ id: 11, name: 'Brian Mwangi' }),
          buildStaffMemberFixture({ id: 12, name: 'Zawadi Njeri' }),
        ],
      }),
    ),
  );
}

describe('Roles list', () => {
  it('lists built-in and custom roles with counts', async () => {
    respondWithRoles();
    customRenderAtRoute({ url: '/roles' });

    const table = await screen.findByRole('table', { name: 'Roles' });
    expect(within(table).getByText('All')).toBeVisible();
    expect(within(table).getByText('6 of 9')).toBeVisible();
    expect(within(table).getByText('0 of 9')).toBeVisible();
    expect(within(table).getAllByText('Built-in')).toHaveLength(2);
    expect(within(table).getByText('None')).toBeVisible();
    expect(within(table).getByText('Full access.')).toBeVisible();
    expect(screen.getByText('3 roles')).toBeVisible();
  });

  it('creates a role and opens it', async () => {
    respondWithRoles();
    let body: unknown;
    server.use(
      http.post(mockEndpoints.roles, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { data: buildRoleDetailFixture({ id: 7, name: 'Cashier', permissions: [] }) },
          { status: 201 },
        );
      }),
    );
    const { router } = customRenderAtRoute({ url: '/roles' });

    await userEvent.click(await screen.findByRole('button', { name: 'New role' }));
    const dialog = await screen.findByRole('dialog', { name: 'New role' });
    await userEvent.type(within(dialog).getByLabelText('Name'), ' Cashier ');
    await userEvent.type(within(dialog).getByLabelText(/Description/), 'Takes payments');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create role' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/roles/7');
    });
    expect(body).toEqual({ name: 'Cashier', description: 'Takes payments', permissions: [] });
  });

  it('shows the APIs name clash under the name', async () => {
    respondWithRoles();
    server.use(
      http.post(mockEndpoints.roles, () =>
        HttpResponse.json(
          {
            message: 'Invalid.',
            errors: { name: ['A role with this name already exists.'] },
          },
          { status: 422 },
        ),
      ),
    );
    const { router } = customRenderAtRoute({ url: '/roles' });

    await userEvent.click(await screen.findByRole('button', { name: 'New role' }));
    const dialog = await screen.findByRole('dialog', { name: 'New role' });
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Packer');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create role' }));

    expect(await within(dialog).findByText('A role with this name already exists.')).toBeVisible();
    expect(router.state.location.pathname).toBe('/roles');
  });

  it('asks for a name before sending anything', async () => {
    respondWithRoles();
    customRenderAtRoute({ url: '/roles' });

    await userEvent.click(await screen.findByRole('button', { name: 'New role' }));
    const dialog = await screen.findByRole('dialog', { name: 'New role' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create role' }));

    expect(await within(dialog).findByText('Enter a role name.')).toBeVisible();
  });

  it('hides New role without staff.manage', async () => {
    respondWithRoles({ permissions: ['staff.view'] });
    customRenderAtRoute({ url: '/roles' });

    await screen.findByRole('table', { name: 'Roles' });
    expect(screen.queryByRole('button', { name: 'New role' })).not.toBeInTheDocument();
  });

  it('opens a role from the list', async () => {
    respondWithRoles();
    const { router } = customRenderAtRoute({ url: '/roles' });

    await userEvent.click(await screen.findByRole('link', { name: 'Packer' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/roles/5');
    });
  });
});
