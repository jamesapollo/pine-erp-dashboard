import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';
import { customRenderAtRoute } from '@/tests/customRender';

function respondWithUser(user = buildUserFixture()) {
  server.use(http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })));
}

function respondUnauthenticated() {
  server.use(
    http.get(mockEndpoints.me, () =>
      HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 }),
    ),
  );
}

describe('AppShell', () => {
  it('shows the store, the user and their role', async () => {
    respondWithUser();
    customRenderAtRoute({ url: '/' });

    expect(await screen.findByText('Zion')).toBeVisible();
    expect(screen.getByText('Wanjiru Kamau')).toBeVisible();
    expect(screen.getByText('Owner')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeVisible();
  });

  it('signs out and returns to login', async () => {
    respondWithUser();
    let logoutRequests = 0;
    server.use(
      http.post(mockEndpoints.logout, () => {
        logoutRequests += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { router } = customRenderAtRoute({ url: '/' });

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(logoutRequests).toBe(1);
    expect(screen.queryByText('Zion')).not.toBeInTheDocument();

    respondUnauthenticated();
    await router.navigate('/');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('still signs out when the session had already expired', async () => {
    respondWithUser();
    server.use(
      http.post(mockEndpoints.logout, () =>
        HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 }),
      ),
    );
    const { router } = customRenderAtRoute({ url: '/' });

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('shows page not found for an unknown page', async () => {
    respondWithUser();
    customRenderAtRoute({ url: '/nope' });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
    expect(screen.getByText('Zion')).toBeVisible();
  });

  it('lets a user without a store sign out', async () => {
    respondWithUser(buildUserFixture({ memberships: [] }));
    const { router } = customRenderAtRoute({ url: '/' });

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});
