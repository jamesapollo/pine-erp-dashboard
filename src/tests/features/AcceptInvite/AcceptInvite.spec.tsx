import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';

import { type InvitationPreview } from '@/types/staff';
import { customRenderAtRoute } from '@/tests/customRender';
import { buildInvitationPreviewFixture } from '@/tests/fixtures/staff';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

const URL = '/accept-invite?token=abc123';

function mockInvitation(preview: InvitationPreview | null) {
  server.use(
    http.get(mockEndpoints.invitation, () =>
      preview === null
        ? HttpResponse.json({ message: 'Not found.' }, { status: 404 })
        : HttpResponse.json({ data: preview }),
    ),
  );
}

function recordAccepts(respond?: () => Response) {
  const calls: { token: string | readonly string[]; body: unknown }[] = [];
  let hasAccepted = false;
  server.use(
    http.post(mockEndpoints.invitationAccept, async ({ request, params }) => {
      const text = await request.text();
      calls.push({ token: params.token ?? '', body: text === '' ? null : JSON.parse(text) });
      const response = respond?.() ?? new HttpResponse(null, { status: 204 });
      if (response.ok) hasAccepted = true;
      return response;
    }),
  );
  return { calls, hasAccepted: () => hasAccepted };
}

async function expectNoDeadLinkWhileSessionReloads() {
  // The session reload after joining is slow; the page must not flash the dead-link screen meanwhile.
  await new Promise((resolve) => setTimeout(resolve, 150));
  expect(screen.queryByRole('heading', { name: 'This invite link no longer works' })).toBeNull();
}

describe('Accept invite', () => {
  it('lets a new person join', async () => {
    mockInvitation(buildInvitationPreviewFixture({ has_password: false }));
    const { calls, hasAccepted } = recordAccepts();
    let isSignedIn = false;
    server.use(
      http.get(mockEndpoints.me, async () => {
        isSignedIn = hasAccepted();
        if (isSignedIn) await delay(300);
        return isSignedIn
          ? HttpResponse.json({ data: buildUserFixture() })
          : HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 });
      }),
    );
    const { router } = customRenderAtRoute({ url: URL });
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Your name'), 'Njeri Kamau');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await user.type(screen.getByLabelText('Confirm password'), 'correct-horse-battery');
    await user.click(screen.getByRole('button', { name: 'Join Zion' }));

    await expectNoDeadLinkWhileSessionReloads();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
    expect(calls).toEqual([
      {
        token: 'abc123',
        body: {
          name: 'Njeri Kamau',
          password: 'correct-horse-battery',
          password_confirmation: 'correct-horse-battery',
        },
      },
    ]);
    expect(isSignedIn).toBe(true);
  });

  it('checks the password rules before sending', async () => {
    mockInvitation(buildInvitationPreviewFixture({ has_password: false }));
    const { calls } = recordAccepts();
    customRenderAtRoute({ url: URL });
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Your name'), 'Njeri Kamau');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.type(screen.getByLabelText('Confirm password'), 'different');
    await user.click(screen.getByRole('button', { name: 'Join Zion' }));

    expect(await screen.findByText('Use at least 12 characters.')).toBeVisible();
    expect(screen.getByText("Passwords don't match.")).toBeVisible();
    expect(calls).toEqual([]);
  });

  it("shows the API's password rule error", async () => {
    mockInvitation(buildInvitationPreviewFixture({ has_password: false }));
    recordAccepts(() =>
      HttpResponse.json(
        { message: 'Invalid.', errors: { password: ['That password has leaked before.'] } },
        { status: 422 },
      ),
    );
    customRenderAtRoute({ url: URL });
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Your name'), 'Njeri Kamau');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await user.type(screen.getByLabelText('Confirm password'), 'correct-horse-battery');
    await user.click(screen.getByRole('button', { name: 'Join Zion' }));

    expect(await screen.findByText('That password has leaked before.')).toBeVisible();
  });

  it('shows the API message and sign out when a signed-in person opens a new-person invite', async () => {
    mockInvitation(buildInvitationPreviewFixture({ has_password: false }));
    recordAccepts(() =>
      HttpResponse.json({ message: "You're signed in as someone else." }, { status: 403 }),
    );
    server.use(http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })));
    customRenderAtRoute({ url: URL });
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Your name'), 'Njeri Kamau');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await user.type(screen.getByLabelText('Confirm password'), 'correct-horse-battery');
    await user.click(screen.getByRole('button', { name: 'Join Zion' }));

    expect(await screen.findByText("You're signed in as someone else.")).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  it('sends someone with a password to sign in and back', async () => {
    mockInvitation(
      buildInvitationPreviewFixture({ has_password: true, email: 'old.hand@zion.com' }),
    );
    customRenderAtRoute({ url: URL });

    const link = await screen.findByRole('link', {
      name: 'Sign in as old.hand@zion.com to join Zion',
    });
    expect(link.getAttribute('href')).toContain(
      '/login?redirect=%2Faccept-invite%3Ftoken%3Dabc123',
    );
  });

  it('brings someone with a password back to join after signing in with no active store', async () => {
    mockInvitation(
      buildInvitationPreviewFixture({ has_password: true, email: 'old.hand@zion.com' }),
    );
    const { hasAccepted } = recordAccepts();
    let isSignedIn = false;
    server.use(
      http.post(mockEndpoints.login, () => {
        isSignedIn = true;
        return new HttpResponse(null, { status: 204 });
      }),
      http.get(mockEndpoints.me, () => {
        if (!isSignedIn) {
          return HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 });
        }
        // The API lists only active memberships, so a re-invited person has none until they join.
        return HttpResponse.json({
          data: hasAccepted() ? buildUserFixture() : buildUserFixture({ memberships: [] }),
        });
      }),
    );
    const { router } = customRenderAtRoute({ url: URL });
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('link', { name: 'Sign in as old.hand@zion.com to join Zion' }),
    );
    await user.type(await screen.findByLabelText('Email'), 'old.hand@zion.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const joinButton = await screen.findByRole('button', { name: 'Join Zion' });
    expect(router.state.location.pathname).toBe('/accept-invite');
    expect(router.state.location.search).toBe('?token=abc123');
    await user.click(joinButton);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
    expect(hasAccepted()).toBe(true);
    expect(
      await screen.findByRole('heading', { name: /^Good (morning|afternoon|evening)/ }),
    ).toBeVisible();
  });

  it('accepts with one button when signed in', async () => {
    mockInvitation(buildInvitationPreviewFixture({ has_password: true }));
    const { calls, hasAccepted } = recordAccepts();
    server.use(
      http.get(mockEndpoints.me, async () => {
        if (hasAccepted()) await delay(300);
        return HttpResponse.json({ data: buildUserFixture() });
      }),
    );
    const { router } = customRenderAtRoute({ url: URL });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Join Zion' }));

    await expectNoDeadLinkWhileSessionReloads();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
    expect(calls).toEqual([{ token: 'abc123', body: null }]);
  });

  it('shows a signed-in-as-someone-else message with sign out', async () => {
    mockInvitation(buildInvitationPreviewFixture({ has_password: true }));
    recordAccepts(() =>
      HttpResponse.json({ message: "You're signed in as someone else." }, { status: 403 }),
    );
    server.use(http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })));
    const { router } = customRenderAtRoute({ url: URL });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Join Zion' }));

    expect(await screen.findByText("You're signed in as someone else.")).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
  });

  describe('says when the link no longer works', () => {
    it('for a dead link', async () => {
      mockInvitation(null);
      customRenderAtRoute({ url: URL });

      expect(
        await screen.findByRole('heading', { name: 'This invite link no longer works' }),
      ).toBeVisible();
      expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login');
    });

    it('for a missing token', async () => {
      customRenderAtRoute({ url: '/accept-invite' });

      expect(
        await screen.findByRole('heading', { name: 'This invite link no longer works' }),
      ).toBeVisible();
    });

    it('when the page is reloaded after a successful accept', async () => {
      let hasAccepted = false;
      server.use(
        http.get(mockEndpoints.invitation, () =>
          hasAccepted
            ? HttpResponse.json({ message: 'Not found.' }, { status: 404 })
            : HttpResponse.json({ data: buildInvitationPreviewFixture() }),
        ),
        http.post(mockEndpoints.invitationAccept, () => {
          hasAccepted = true;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const first = customRenderAtRoute({ url: URL });
      const user = userEvent.setup();
      await user.type(await screen.findByLabelText('Your name'), 'Njeri Kamau');
      await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
      await user.type(screen.getByLabelText('Confirm password'), 'correct-horse-battery');
      await user.click(screen.getByRole('button', { name: 'Join Zion' }));
      await waitFor(() => {
        expect(first.router.state.location.pathname).toBe('/');
      });
      first.unmount();

      customRenderAtRoute({ url: URL });

      expect(
        await screen.findByRole('heading', { name: 'This invite link no longer works' }),
      ).toBeVisible();
    });
  });
});
