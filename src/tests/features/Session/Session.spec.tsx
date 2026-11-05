import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';
import { customRenderAtRoute } from '@/tests/customRender';
import { axiosInstance } from '@/utils/axiosConfig';

function respondWithUser(user = buildUserFixture()) {
  server.use(http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })));
}

describe('Session', () => {
  it('sends a signed-out visitor to login and remembers where they were going', async () => {
    const { router } = customRenderAtRoute({ url: '/orders/42?tab=items' });

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toBe('?redirect=%2Forders%2F42%3Ftab%3Ditems');
  });

  it('sends a signed-in user away from login', async () => {
    respondWithUser();
    const { router } = customRenderAtRoute({ url: '/login' });

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(
      await screen.findByRole('heading', { name: /^Good (morning|afternoon|evening)/ }),
    ).toBeVisible();
  });

  it('shows the no-store screen when there is no active membership', async () => {
    respondWithUser(buildUserFixture({ memberships: [] }));
    customRenderAtRoute({ url: '/' });

    expect(await screen.findByText("You don't have access to a store yet")).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  it('sends a user with no active membership from login to the root, not to another redirect', async () => {
    respondWithUser(buildUserFixture({ memberships: [] }));
    const { router } = customRenderAtRoute({ url: '/login?redirect=%2Forders%2F42' });

    expect(await screen.findByText("You don't have access to a store yet")).toBeVisible();
    expect(router.state.location.pathname).toBe('/');
    expect(router.state.location.search).toBe('');
  });

  it('sends a user with no active membership from login back to an invite they are accepting', async () => {
    respondWithUser(buildUserFixture({ memberships: [] }));
    const { router } = customRenderAtRoute({
      url: '/login?redirect=%2Faccept-invite%3Ftoken%3Dabc123',
    });

    await waitFor(() => expect(router.state.location.pathname).toBe('/accept-invite'));
    expect(router.state.location.search).toBe('?token=abc123');
  });

  it('shows a retry when the server cannot be reached', async () => {
    server.use(http.get(mockEndpoints.me, () => HttpResponse.error()));
    customRenderAtRoute({ url: '/' });

    expect(await screen.findByText("Can't reach the server.")).toBeVisible();

    respondWithUser();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { name: /^Good (morning|afternoon|evening)/ }),
    ).toBeVisible();
  });

  it('opens the reset page whether or not the user is signed in', async () => {
    respondWithUser();
    const { router } = customRenderAtRoute({ url: '/reset-password?token=t&email=a%40b.c' });

    expect(await screen.findByRole('heading', { name: 'Set a new password' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/reset-password');
  });

  it.each([
    { url: '/', sentinel: /^Good (morning|afternoon|evening)/ },
    { url: '/orders', sentinel: 'Orders' },
    { url: '/products', sentinel: 'Products' },
  ])(
    'sends the user to login when a request comes back 401 mid-session on $url',
    async ({ url, sentinel }) => {
      respondWithUser();
      server.use(
        http.get('/api/v1/stores/1', () =>
          HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 }),
        ),
      );
      const { router } = customRenderAtRoute({ url });
      expect(await screen.findByRole('heading', { name: sentinel })).toBeVisible();

      await expect(axiosInstance.get('/api/v1/stores/1')).rejects.toThrow();

      await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
      expect(screen.queryByText('Unexpected Application Error!')).not.toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Sign in' })).toBeVisible();
    },
  );
});
