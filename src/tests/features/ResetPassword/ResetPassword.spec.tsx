import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { customRenderAtRoute } from '@/tests/customRender';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

const URL = '/reset-password?token=tok123&email=wanjiru%40zion.com';
const PASSWORD = 'a-long-new-password';

function recordResetRequests(
  respond: () => Response = () => new HttpResponse(null, { status: 204 }),
) {
  const bodies: unknown[] = [];
  server.use(
    http.post(mockEndpoints.resetPassword, async ({ request }) => {
      bodies.push(await request.json());
      return respond();
    }),
  );
  return bodies;
}

async function fillAndSubmit(password = PASSWORD, confirmation = password) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('New password'), password);
  await user.type(screen.getByLabelText('Confirm password'), confirmation);
  await user.click(screen.getByRole('button', { name: 'Save password' }));
  return user;
}

describe('Reset password', () => {
  it('saves the new password and asks the user to sign in again', async () => {
    const bodies = recordResetRequests();
    const { router } = customRenderAtRoute({ url: URL });

    await fillAndSubmit();

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(bodies).toEqual([
      {
        token: 'tok123',
        email: 'wanjiru@zion.com',
        password: PASSWORD,
        password_confirmation: PASSWORD,
      },
    ]);
    expect(
      await screen.findByText('Password saved. Sign in with your new password.'),
    ).toBeVisible();
  });

  it('signs out a user who was signed in', async () => {
    server.use(http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })));
    recordResetRequests();
    const { router } = customRenderAtRoute({ url: URL });

    await fillAndSubmit();

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('checks length and matching before sending', async () => {
    const bodies = recordResetRequests();
    customRenderAtRoute({ url: URL });

    const user = await fillAndSubmit('short');
    expect(await screen.findByText('Use at least 12 characters.')).toBeVisible();

    await user.clear(screen.getByLabelText('New password'));
    await user.clear(screen.getByLabelText('Confirm password'));
    await user.type(screen.getByLabelText('New password'), PASSWORD);
    await user.type(screen.getByLabelText('Confirm password'), 'a-different-password');
    await user.click(screen.getByRole('button', { name: 'Save password' }));

    expect(await screen.findByText("Passwords don't match.")).toBeVisible();
    expect(bodies).toHaveLength(0);
  });

  it('explains an invalid or expired link', async () => {
    recordResetRequests(() =>
      HttpResponse.json(
        { errors: { email: ['This password reset token is invalid.'] } },
        { status: 422 },
      ),
    );
    customRenderAtRoute({ url: URL });

    await fillAndSubmit();

    expect(await screen.findByText('This reset link is invalid or has expired.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Request a new reset link' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    expect(screen.queryByLabelText('New password')).toBeNull();
  });

  it('shows a password rule from the server', async () => {
    const message =
      'The given password has appeared in a data leak. Please choose a different password.';
    recordResetRequests(() =>
      HttpResponse.json({ errors: { password: [message] } }, { status: 422 }),
    );
    customRenderAtRoute({ url: URL });

    await fillAndSubmit();

    expect(await screen.findByText(message)).toBeVisible();
  });

  it('asks the user to wait after too many requests', async () => {
    recordResetRequests(
      () => new HttpResponse(null, { status: 429, headers: { 'Retry-After': '30' } }),
    );
    customRenderAtRoute({ url: URL });

    await fillAndSubmit();

    expect(await screen.findByText('Too many requests. Try again in 30 seconds.')).toBeVisible();
  });

  it('shows a general error when the server fails', async () => {
    recordResetRequests(() => new HttpResponse(null, { status: 500 }));
    customRenderAtRoute({ url: URL });

    await fillAndSubmit();

    expect(await screen.findByText('Something went wrong. Try again.')).toBeVisible();
  });

  it('handles a link with missing parts', async () => {
    customRenderAtRoute({ url: '/reset-password?token=tok123' });

    expect(
      await screen.findByText('This reset link is incomplete. Request a new one.'),
    ).toBeVisible();
    expect(screen.queryByLabelText('New password')).toBeNull();
    expect(screen.getByRole('link', { name: 'Request a new reset link' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('keeps a plus sign in the email', async () => {
    const bodies = recordResetRequests();
    customRenderAtRoute({ url: '/reset-password?token=tok123&email=a%2Bb%40zion.com' });

    expect(await screen.findByLabelText('Email')).toHaveValue('a+b@zion.com');
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly');
    await fillAndSubmit();

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ email: 'a+b@zion.com' });
  });
});
