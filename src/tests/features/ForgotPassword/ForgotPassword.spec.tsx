import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { customRenderAtRoute } from '@/tests/customRender';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

const EMAIL = 'wanjiru@zion.co.ke';

function recordForgotPasswordRequests(
  respond: () => Response = () => new HttpResponse(null, { status: 204 }),
) {
  const bodies: unknown[] = [];
  server.use(
    http.post(mockEndpoints.forgotPassword, async ({ request }) => {
      bodies.push(await request.json());
      return respond();
    }),
  );
  return bodies;
}

async function fillAndSubmit(email = EMAIL) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Email'), email);
  await user.click(screen.getByRole('button', { name: 'Send reset link' }));
  return user;
}

describe('Forgot password', () => {
  it('shows the same confirmation after sending', async () => {
    const bodies = recordForgotPasswordRequests();
    customRenderAtRoute({ url: '/forgot-password' });

    await fillAndSubmit();

    expect(
      await screen.findByText(
        `Check your email. If an account exists for ${EMAIL}, a reset link is on its way. The link expires in 60 minutes.`,
      ),
    ).toBeVisible();
    expect(bodies).toEqual([{ email: EMAIL }]);
    expect(screen.queryByLabelText('Email')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Send reset link' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toBeVisible();
  });

  it('shows the API message for an invalid email', async () => {
    const message = 'The email field must be a valid email address.';
    recordForgotPasswordRequests(() =>
      HttpResponse.json({ message, errors: { email: [message] } }, { status: 422 }),
    );
    customRenderAtRoute({ url: '/forgot-password' });

    await fillAndSubmit();

    expect(await screen.findByText(message)).toBeVisible();
  });

  it('asks the user to wait after too many requests', async () => {
    recordForgotPasswordRequests(
      () => new HttpResponse(null, { status: 429, headers: { 'Retry-After': '30' } }),
    );
    customRenderAtRoute({ url: '/forgot-password' });

    await fillAndSubmit();

    expect(await screen.findByText('Too many requests. Try again in 30 seconds.')).toBeVisible();
  });

  it('shows a general error when the server fails', async () => {
    recordForgotPasswordRequests(() => new HttpResponse(null, { status: 500 }));
    customRenderAtRoute({ url: '/forgot-password' });

    await fillAndSubmit();

    expect(await screen.findByText('Something went wrong. Try again.')).toBeVisible();
  });

  it('validates the email before sending', async () => {
    const bodies = recordForgotPasswordRequests();
    customRenderAtRoute({ url: '/forgot-password' });

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByText('Enter your email.')).toBeVisible();
    expect(bodies).toHaveLength(0);
  });

  it('links back to sign in', async () => {
    const { router } = customRenderAtRoute({ url: '/forgot-password' });

    const user = userEvent.setup();
    await user.click(await screen.findByRole('link', { name: 'Back to sign in' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('is not available to a signed-in user', async () => {
    server.use(http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })));
    const { router } = customRenderAtRoute({ url: '/forgot-password' });

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});
