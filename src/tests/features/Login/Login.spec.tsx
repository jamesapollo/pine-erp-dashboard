import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';

import { customRenderAtRoute } from '@/tests/customRender';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

const EMAIL = 'wanjiru@zion.co.ke';
const PASSWORD = 'correct-horse-battery';

function recordLogins(
  respond: () => Response | Promise<Response> = () => new HttpResponse(null, { status: 204 }),
) {
  const calls: { body: unknown; csrfRequestedBefore: boolean }[] = [];
  let csrfRequested = false;
  let signedIn = false;
  server.use(
    http.get(mockEndpoints.csrfCookie, () => {
      csrfRequested = true;
      return new HttpResponse(null, { status: 204 });
    }),
    http.get(mockEndpoints.me, () =>
      signedIn
        ? HttpResponse.json({ data: buildUserFixture() })
        : HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 }),
    ),
    http.post(mockEndpoints.login, async ({ request }) => {
      calls.push({ body: await request.json(), csrfRequestedBefore: csrfRequested });
      const response = await respond();
      if (response.ok) signedIn = true;
      return response;
    }),
  );
  return calls;
}

async function fillAndSubmit(email = EMAIL, password = PASSWORD) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  return user;
}

describe('Login', () => {
  it('signs in and returns to the page the user wanted', async () => {
    const calls = recordLogins();
    const { router } = customRenderAtRoute({ url: '/login?redirect=%2Forders%2F42' });

    await fillAndSubmit();

    await waitFor(() => expect(router.state.location.pathname).toBe('/orders/42'));
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toEqual({ email: EMAIL, password: PASSWORD });
    expect(calls[0].csrfRequestedBefore).toBe(true);
  });

  it('goes to the overview when the redirect points off-site', async () => {
    recordLogins();
    const { router } = customRenderAtRoute({ url: '/login?redirect=%2F%2Fevil.com' });

    await fillAndSubmit();

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('shows the API message when the credentials are wrong', async () => {
    const message = 'These credentials do not match our records.';
    recordLogins(() =>
      HttpResponse.json({ message, errors: { email: [message] } }, { status: 422 }),
    );
    const { router } = customRenderAtRoute({ url: '/login' });

    await fillAndSubmit();

    expect(await screen.findByText(message)).toBeVisible();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('tells the user how long to wait after too many attempts', async () => {
    recordLogins(() => new HttpResponse(null, { status: 429, headers: { 'Retry-After': '42' } }));
    customRenderAtRoute({ url: '/login' });

    await fillAndSubmit();

    expect(await screen.findByText('Too many attempts. Try again in 42 seconds.')).toBeVisible();
  });

  it('shows a general error when the server fails', async () => {
    recordLogins(() => new HttpResponse(null, { status: 500 }));
    customRenderAtRoute({ url: '/login' });

    await fillAndSubmit();

    expect(await screen.findByText('Something went wrong. Try again.')).toBeVisible();
  });

  it('validates before sending', async () => {
    const calls = recordLogins();
    customRenderAtRoute({ url: '/login' });

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email.')).toBeVisible();
    expect(screen.getByText('Enter your password.')).toBeVisible();
    expect(calls).toHaveLength(0);
  });

  it('sends one request when submitted twice quickly', async () => {
    const calls = recordLogins(async () => {
      await delay(200);
      return new HttpResponse(null, { status: 204 });
    });
    const { router } = customRenderAtRoute({ url: '/login' });

    const user = await fillAndSubmit();
    await user.dblClick(screen.getByRole('button', { name: /sign in/i }));
    await user.keyboard('{Enter}');

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(calls).toHaveLength(1);
  });

  it('trims the email before sending', async () => {
    const calls = recordLogins();
    customRenderAtRoute({ url: '/login' });

    await fillAndSubmit('  Wanjiru@Zion.co.ke ');

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].body).toEqual({ email: 'Wanjiru@Zion.co.ke', password: PASSWORD });
  });

  it('does not offer "Keep me signed in"', async () => {
    customRenderAtRoute({ url: '/login' });

    expect(await screen.findByLabelText('Email')).toBeVisible();
    expect(screen.queryByLabelText(/keep me signed in/i)).toBeNull();
  });

  it('shows the password-saved notice after a reset', async () => {
    customRenderAtRoute({ url: '/login', state: { notice: 'passwordReset' } });

    expect(
      await screen.findByText('Password saved. Sign in with your new password.'),
    ).toBeVisible();
  });
});
