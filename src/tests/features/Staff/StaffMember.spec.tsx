import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type StaffMember } from '@/types/staff';
import { customRenderAtRoute } from '@/tests/customRender';
import {
  buildPermissionFixture,
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
  permissions: ['store.view', 'staff.manage'],
});
const managerRole = buildRoleFixture();
const staffRole = buildRoleFixture({
  id: 3,
  name: 'Staff',
  slug: 'staff',
  is_system: false,
  permissions: ['store.view', 'catalogue.view', 'orders.view'],
});

const invitedMember = buildStaffMemberFixture({
  id: 12,
  name: 'Kofi Otieno',
  email: 'kofi@zion.co.ke',
  status: 'invited',
  role: { id: 3, name: 'Staff', slug: 'staff', is_system: false },
  last_active_at: null,
  joined_at: null,
  invitation: {
    sent_at: '2026-11-01T08:00:00+00:00',
    expires_at: '2026-11-08T08:00:00+00:00',
    invited_by_name: 'Wanjiru Kamau',
  },
});

function respondWithMember(member: StaffMember, { permissions }: { permissions?: string[] } = {}) {
  const user = buildUserFixture();
  if (permissions) user.memberships[0].permissions = permissions;
  let current = member;
  let rolesRequests = 0;
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.staffMember, () => HttpResponse.json({ data: current })),
    http.get(mockEndpoints.roles, () => {
      rolesRequests += 1;
      return HttpResponse.json({ data: [ownerRole, managerRole, staffRole] });
    }),
    http.get(mockEndpoints.permissions, () =>
      HttpResponse.json({
        data: [
          buildPermissionFixture({
            slug: 'catalogue.manage',
            description: 'Create and edit products.',
          }),
        ],
      }),
    ),
  );
  return {
    getRolesRequests: () => rolesRequests,
    setCurrent: (next: StaffMember) => {
      current = next;
    },
  };
}

describe('Staff member detail', () => {
  it('shows an invited member with resend and revoke', async () => {
    respondWithMember(invitedMember);
    let resendRequests = 0;
    server.use(
      http.post(mockEndpoints.staffMemberInvitation, () => {
        resendRequests += 1;
        return HttpResponse.json({ data: invitedMember });
      }),
    );
    customRenderAtRoute({ url: '/staff/12' });

    expect(await screen.findByRole('heading', { name: /Kofi Otieno/ })).toBeVisible();
    expect(screen.getByText('Invitation pending')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Revoke invite' })).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Resend invite' }));
    const dialog = await screen.findByRole('dialog', { name: 'Resend invitation?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Resend invite' }));

    expect(await screen.findByText('Invite resent')).toBeVisible();
    expect(resendRequests).toBe(1);
  });

  it('revokes an invite after confirming and returns to the list', async () => {
    respondWithMember(invitedMember);
    server.use(
      http.delete(
        mockEndpoints.staffMemberInvitation,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const { router } = customRenderAtRoute({ url: '/staff/12' });

    await userEvent.click(await screen.findByRole('button', { name: 'Revoke invite' }));
    const dialog = await screen.findByRole('dialog', { name: 'Revoke invitation?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Revoke invite' }));

    expect(await screen.findByText('Invite revoked')).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe('/staff'));
  });

  it('changes the role and refreshes the list', async () => {
    const { getRolesRequests } = respondWithMember(
      buildStaffMemberFixture({ role: { ...staffRole, is_system: false } }),
    );
    let body: unknown;
    server.use(
      http.patch(mockEndpoints.staffMember, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: buildStaffMemberFixture() });
      }),
    );
    customRenderAtRoute({ url: '/staff/11' });

    const select = await screen.findByLabelText('Role');
    expect(screen.getByRole('button', { name: 'Save role' })).toBeDisabled();
    await userEvent.selectOptions(select, 'Manager');
    expect(screen.getByText('Takes effect straight away')).toBeVisible();
    const rolesRequestsBeforeSave = getRolesRequests();
    await userEvent.click(screen.getByRole('button', { name: 'Save role' }));

    expect(await screen.findByText('Role changed')).toBeVisible();
    await waitFor(() => expect(getRolesRequests()).toBeGreaterThan(rolesRequestsBeforeSave));
    expect(body).toEqual({ role_id: 2 });
  });

  it('saves a changed name', async () => {
    respondWithMember(buildStaffMemberFixture());
    let body: unknown;
    server.use(
      http.patch(mockEndpoints.staffMember, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: buildStaffMemberFixture({ name: 'Brian M' }) });
      }),
    );
    customRenderAtRoute({ url: '/staff/11' });

    const nameInput = await screen.findByLabelText('Name');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Brian M');
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }));

    expect(await screen.findByText('Name saved')).toBeVisible();
    expect(body).toEqual({ name: 'Brian M' });
  });

  it('lists what the role can do without hidden permissions', async () => {
    respondWithMember(buildStaffMemberFixture());
    customRenderAtRoute({ url: '/staff/11' });

    expect(await screen.findByText('What Manager can do')).toBeVisible();
    expect(await screen.findByText('Create and edit products.')).toBeVisible();
    expect(screen.getByText('catalogue.manage')).toBeVisible();
    expect(screen.getByText('orders.view')).toBeVisible();
    expect(screen.queryByText('store.view')).not.toBeInTheDocument();
  });

  it('deactivates after confirming, then offers reactivate', async () => {
    const { setCurrent } = respondWithMember(buildStaffMemberFixture());
    server.use(
      http.post(mockEndpoints.staffDeactivate, () => {
        const suspended = buildStaffMemberFixture({ status: 'suspended' });
        setCurrent(suspended);
        return HttpResponse.json({ data: suspended });
      }),
    );
    customRenderAtRoute({ url: '/staff/11' });

    expect(await screen.findByRole('button', { name: 'Send reset link' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    const dialog = await screen.findByRole('dialog', { name: 'Deactivate Brian Mwangi?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    expect(await screen.findByText('Brian Mwangi deactivated')).toBeVisible();
    expect(await screen.findByRole('button', { name: 'Reactivate' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Send reset link' })).not.toBeInTheDocument();
  });

  it('sends a reset link', async () => {
    respondWithMember(buildStaffMemberFixture());
    server.use(
      http.post(mockEndpoints.staffPasswordReset, () => new HttpResponse(null, { status: 204 })),
    );
    customRenderAtRoute({ url: '/staff/11' });

    await userEvent.click(await screen.findByRole('button', { name: 'Send reset link' }));
    const dialog = await screen.findByRole('dialog', { name: 'Send password reset?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send link' }));

    expect(await screen.findByText('Reset link sent to brian@zion.co.ke')).toBeVisible();
  });

  it('removes after confirming and returns to the list', async () => {
    respondWithMember(buildStaffMemberFixture());
    server.use(
      http.delete(mockEndpoints.staffMember, () => new HttpResponse(null, { status: 204 })),
    );
    const { router } = customRenderAtRoute({ url: '/staff/11' });

    await userEvent.click(await screen.findByRole('button', { name: 'Remove Brian Mwangi' }));
    const dialog = await screen.findByRole('dialog', { name: 'Remove Brian Mwangi?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));

    expect(await screen.findByText('Brian Mwangi removed')).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toBe('/staff'));
  });

  it('lets the owner rename themselves but hides the rest', async () => {
    respondWithMember(
      buildStaffMemberFixture({
        id: 10,
        name: 'Wanjiru Kamau',
        is_owner: true,
        role: { id: 1, name: 'Owner', slug: 'owner', is_system: true },
      }),
    );
    customRenderAtRoute({ url: '/staff/10' });

    expect(await screen.findByText('The store owner’s role can’t be changed.')).toBeVisible();
    expect(screen.getByLabelText('Name')).toHaveValue('Wanjiru Kamau');
    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save role' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send reset link' })).not.toBeInTheDocument();
    expect(screen.queryByText('Remove from store')).not.toBeInTheDocument();
  });

  it('shows action errors in place', async () => {
    respondWithMember(buildStaffMemberFixture());
    server.use(
      http.post(mockEndpoints.staffDeactivate, () => new HttpResponse(null, { status: 409 })),
    );
    customRenderAtRoute({ url: '/staff/11' });

    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    const dialog = await screen.findByRole('dialog', { name: 'Deactivate Brian Mwangi?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    expect(await within(dialog).findByText('Something went wrong. Try again.')).toBeVisible();
  });

  it('is read-only without staff.manage', async () => {
    respondWithMember(buildStaffMemberFixture(), { permissions: ['staff.view', 'store.view'] });
    customRenderAtRoute({ url: '/staff/11' });

    expect(await screen.findByRole('heading', { name: /Brian Mwangi/ })).toBeVisible();
    expect(screen.getByLabelText('Name')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save name' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
    expect(screen.queryByText('Remove from store')).not.toBeInTheDocument();
  });

  it('shows not found when the API has no such member', async () => {
    const user = buildUserFixture();
    server.use(
      http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
      http.get(mockEndpoints.staffMember, () =>
        HttpResponse.json({ message: 'Not found.' }, { status: 404 }),
      ),
    );
    customRenderAtRoute({ url: '/staff/99' });
    expect(await screen.findByText(/page not found/i)).toBeVisible();
  });

  it('shows not found for a non-numeric id', async () => {
    server.use(http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })));
    customRenderAtRoute({ url: '/staff/abc' });
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});
