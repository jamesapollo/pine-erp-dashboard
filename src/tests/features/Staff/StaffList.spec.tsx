import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { customRenderAtRoute } from '@/tests/customRender';
import { buildRoleFixture, buildStaffMemberFixture } from '@/tests/fixtures/staff';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

const ownerRole = buildRoleFixture({
  id: 1,
  name: 'Owner',
  slug: 'owner',
  permissions: ['store.view', 'staff.manage'],
});
const staffRole = buildRoleFixture({
  id: 3,
  name: 'Staff',
  slug: 'staff',
  is_system: false,
  permissions: ['store.view', 'catalogue.view', 'orders.view'],
});

function respondWithTeam({ permissions }: { permissions?: string[] } = {}) {
  const user = buildUserFixture();
  if (permissions) user.memberships[0].permissions = permissions;
  let listRequests = 0;
  const members = [
    buildStaffMemberFixture({
      id: 10,
      name: 'Wanjiru Kamau',
      email: 'wanjiru@zion.com',
      is_owner: true,
      role: { id: 1, name: 'Owner', slug: 'owner', is_system: true },
      last_active_at: new Date().toISOString(),
    }),
    buildStaffMemberFixture({
      id: 12,
      name: 'Kofi Otieno',
      email: 'kofi@zion.com',
      status: 'invited',
      role: { id: 3, name: 'Staff', slug: 'staff', is_system: false },
      last_active_at: null,
      invitation: {
        sent_at: '2026-11-01T08:00:00+00:00',
        expires_at: '2026-11-08T08:00:00+00:00',
        invited_by_name: 'Wanjiru Kamau',
      },
    }),
    buildStaffMemberFixture({ id: 13, name: 'Zawadi Njeri', last_active_at: null }),
  ];
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.staff, () => {
      listRequests += 1;
      return HttpResponse.json({ data: members });
    }),
    http.get(mockEndpoints.roles, () =>
      HttpResponse.json({ data: [ownerRole, buildRoleFixture(), staffRole] }),
    ),
  );
  return { getListRequests: () => listRequests };
}

describe('Staff list', () => {
  it('lists the team with roles, statuses and last active', async () => {
    respondWithTeam();
    customRenderAtRoute({ url: '/staff' });

    const table = await screen.findByRole('table', { name: 'Staff' });
    expect(within(table).getByText('Wanjiru Kamau')).toBeVisible();
    expect(within(table).getByText('Kofi Otieno')).toBeVisible();
    expect(within(table).getByText('Owner')).toBeVisible();
    expect(within(table).getByText('Invited')).toBeVisible();
    expect(within(table).getByText('Just now')).toBeVisible();
    expect(within(table).getByText('Never')).toBeVisible();
    expect(within(table).getByText(/^Invited · expires /)).toBeVisible();
  });

  it('opens a member from the list', async () => {
    respondWithTeam();
    const { router } = customRenderAtRoute({ url: '/staff' });

    await userEvent.click(await screen.findByRole('link', { name: 'Kofi Otieno' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/staff/12');
    });
  });

  it('invites someone and refreshes the list', async () => {
    const team = respondWithTeam();
    let body: unknown;
    server.use(
      http.post(mockEndpoints.staffInvitations, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: buildStaffMemberFixture({ id: 14 }) }, { status: 201 });
      }),
    );
    customRenderAtRoute({ url: '/staff' });

    await userEvent.click(await screen.findByRole('button', { name: 'Invite staff' }));
    const dialog = await screen.findByRole('dialog', { name: 'Invite staff' });
    await userEvent.type(within(dialog).getByLabelText('Email'), 'ama@example.com');
    const picker = within(dialog).getByLabelText('Role');
    expect(within(picker).queryByRole('option', { name: 'Owner' })).not.toBeInTheDocument();
    expect(picker).toHaveValue('3');
    expect(within(dialog).getByText('2 permissions')).toBeVisible();
    const requestsBefore = team.getListRequests();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send invite' }));

    expect(await screen.findByText('Invite sent to ama@example.com')).toBeVisible();
    expect(body).toEqual({ email: 'ama@example.com', role_id: 3 });
    await waitFor(() => {
      expect(team.getListRequests()).toBeGreaterThan(requestsBefore);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("shows the API's message under the email", async () => {
    respondWithTeam();
    server.use(
      http.post(mockEndpoints.staffInvitations, () =>
        HttpResponse.json(
          { message: 'Invalid.', errors: { email: ['This person is already on the team.'] } },
          { status: 422 },
        ),
      ),
    );
    customRenderAtRoute({ url: '/staff' });

    await userEvent.click(await screen.findByRole('button', { name: 'Invite staff' }));
    const dialog = await screen.findByRole('dialog', { name: 'Invite staff' });
    await userEvent.type(within(dialog).getByLabelText('Email'), 'kofi@zion.com');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send invite' }));

    expect(await within(dialog).findByText('This person is already on the team.')).toBeVisible();
    expect(screen.getByRole('dialog', { name: 'Invite staff' })).toBeVisible();
  });

  it('preselects the Staff role and falls back to the placeholder without one', async () => {
    respondWithTeam();
    server.use(
      http.get(mockEndpoints.roles, () =>
        HttpResponse.json({ data: [ownerRole, buildRoleFixture()] }),
      ),
    );
    customRenderAtRoute({ url: '/staff' });

    await userEvent.click(await screen.findByRole('button', { name: 'Invite staff' }));
    const dialog = await screen.findByRole('dialog', { name: 'Invite staff' });
    expect(within(dialog).getByLabelText('Role')).toHaveValue('');
    expect(within(dialog).getByRole('option', { name: 'Choose a role' })).toBeVisible();
  });

  it('explains a failed roles load inside the invite dialog and retries', async () => {
    respondWithTeam();
    let shouldFail = true;
    server.use(
      http.get(mockEndpoints.roles, () =>
        shouldFail
          ? HttpResponse.json({ message: 'Server error.' }, { status: 500 })
          : HttpResponse.json({ data: [ownerRole, staffRole] }),
      ),
    );
    customRenderAtRoute({ url: '/staff' });

    await userEvent.click(await screen.findByRole('button', { name: 'Invite staff' }));
    const dialog = await screen.findByRole('dialog', { name: 'Invite staff' });
    expect(await within(dialog).findByText('Something went wrong. Try again.')).toBeVisible();

    shouldFail = false;
    await userEvent.click(within(dialog).getByRole('button', { name: 'Try again' }));
    // The dialog is replaced by the form once the roles load.
    expect(await screen.findByLabelText('Role')).toHaveValue('3');
  });

  it('shows the store name, member count and design copy', async () => {
    respondWithTeam();
    customRenderAtRoute({ url: '/staff' });

    expect(
      await screen.findByText('People who can sign in to Zion. Each person has one role.'),
    ).toBeVisible();
    expect(screen.getByText('Members')).toBeVisible();
    expect(screen.getByText('3 people')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Invite staff' }));
    expect(await screen.findByText("They'll get an email to set a password.")).toBeVisible();
  });

  it('words the permission hint in the singular for a one-permission role', async () => {
    respondWithTeam();
    const viewerRole = buildRoleFixture({
      id: 4,
      name: 'Viewer',
      slug: 'viewer',
      is_system: false,
      permissions: ['store.view', 'orders.view'],
    });
    server.use(
      http.get(mockEndpoints.roles, () =>
        HttpResponse.json({ data: [ownerRole, staffRole, viewerRole] }),
      ),
    );
    customRenderAtRoute({ url: '/staff' });

    await userEvent.click(await screen.findByRole('button', { name: 'Invite staff' }));
    const dialog = await screen.findByRole('dialog', { name: 'Invite staff' });
    await userEvent.selectOptions(within(dialog).getByLabelText('Role'), 'Viewer');

    expect(within(dialog).getByText('1 permission')).toBeVisible();
  });

  it('hides invite and manage roles without staff.manage', async () => {
    respondWithTeam({ permissions: ['store.view', 'staff.view'] });
    customRenderAtRoute({ url: '/staff' });

    expect(await screen.findByText('Kofi Otieno')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Invite staff' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Manage roles' })).not.toBeInTheDocument();
  });

  it('shows manage roles with staff.manage', async () => {
    respondWithTeam();
    customRenderAtRoute({ url: '/staff' });

    expect(await screen.findByRole('link', { name: 'Manage roles' })).toHaveAttribute(
      'href',
      '/roles',
    );
  });

  it('shows no access without staff.view', async () => {
    respondWithTeam({ permissions: ['store.view'] });
    customRenderAtRoute({ url: '/staff' });

    expect(await screen.findByText("You don't have access to staff.")).toBeVisible();
  });
});
