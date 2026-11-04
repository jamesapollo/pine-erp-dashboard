import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type EnquiryDetail } from '@/types/enquiry';
import { customRenderAtRoute } from '@/tests/customRender';
import { buildEnquiryDetailFixture, buildEnquiryReplyFixture } from '@/tests/fixtures/enquiries';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

const replyUrl = `${mockEndpoints.enquiry}/replies`;
const resendUrl = `${mockEndpoints.enquiry}/replies/:replyId/resend`;

// A stateful stand-in for the API: the detail answers with whatever the last write left behind.
function serveEnquiry(initial: EnquiryDetail, user = buildUserFixture()) {
  let current = initial;
  const writes: { method: string; body: unknown }[] = [];
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.enquiries, () =>
      HttpResponse.json({ data: [], links: {}, meta: { total: 0, current_page: 1, last_page: 1 } }),
    ),
    http.get(mockEndpoints.enquiry, () => HttpResponse.json({ data: current })),
    http.post(replyUrl, async ({ request }) => {
      const body = (await request.json()) as { body: string };
      writes.push({ method: 'POST', body });
      const reply = buildEnquiryReplyFixture({ id: 99, body: body.body, mail_status: 'queued' });
      current = { ...current, status: 'replied', replies: [...current.replies, reply] };
      return HttpResponse.json({ data: reply }, { status: 201 });
    }),
    http.patch(mockEndpoints.enquiry, async ({ request }) => {
      const body = (await request.json()) as { status: 'closed' | 'new' };
      writes.push({ method: 'PATCH', body });
      current = { ...current, status: body.status };
      return HttpResponse.json({ data: current });
    }),
    http.post(resendUrl, () => {
      writes.push({ method: 'RESEND', body: null });
      current = {
        ...current,
        replies: current.replies.map((reply) => ({ ...reply, mail_status: 'queued' as const })),
      };
      return HttpResponse.json({ data: current.replies[0] });
    }),
  );
  return writes;
}

function userWithoutManage() {
  const user = buildUserFixture();
  return buildUserFixture({
    memberships: user.memberships.map((membership) => ({
      ...membership,
      permissions: membership.permissions.filter((slug) => slug !== 'enquiries.manage'),
    })),
  });
}

describe('Message detail', () => {
  it('shows the original message, topic and sender email', async () => {
    serveEnquiry(buildEnquiryDetailFixture());
    customRenderAtRoute({ url: '/messages/7' });

    expect(await screen.findByRole('heading', { name: 'Amina Hassan' })).toBeVisible();
    expect(screen.getByText('amina@example.com')).toBeVisible();
    expect(screen.getByText('Custom order')).toBeVisible();
    expect(screen.getByText(/Hello, can you make this in blue\?/)).toBeVisible();
    expect(screen.getByText(/I need it by March\./)).toBeVisible();
    expect(screen.getByText('New')).toBeVisible();
  });

  it('copies the sender email', async () => {
    serveEnquiry(buildEnquiryDetailFixture());
    const user = userEvent.setup();
    customRenderAtRoute({ url: '/messages/7' });

    await user.click(await screen.findByRole('button', { name: 'Copy email' }));

    expect(await screen.findByText('Copied')).toBeVisible();
    expect(await navigator.clipboard.readText()).toBe('amina@example.com');
  });

  it('lists replies with author and delivery state', async () => {
    serveEnquiry(
      buildEnquiryDetailFixture({
        status: 'replied',
        replies: [
          buildEnquiryReplyFixture({ id: 1, body: 'First answer', mail_status: 'sent' }),
          buildEnquiryReplyFixture({ id: 2, body: 'Second answer', mail_status: 'queued' }),
          buildEnquiryReplyFixture({
            id: 3,
            body: 'Third answer',
            mail_status: 'failed',
            author_name: null,
          }),
        ],
      }),
    );
    customRenderAtRoute({ url: '/messages/7' });

    const first = (await screen.findByText('First answer')).closest('li') as HTMLElement;
    expect(within(first).getByText('Wanjiru Kamau')).toBeVisible();
    expect(within(first).getByText('Sent')).toBeVisible();
    const second = screen.getByText('Second answer').closest('li') as HTMLElement;
    expect(within(second).getByText('Sending')).toBeVisible();
    const third = screen.getByText('Third answer').closest('li') as HTMLElement;
    expect(within(third).getByText('Not delivered')).toBeVisible();
    expect(within(third).getByText('Former staff member')).toBeVisible();
  });

  it('offers Resend only on a reply whose email failed, and queues it again', async () => {
    const writes = serveEnquiry(
      buildEnquiryDetailFixture({
        status: 'replied',
        replies: [buildEnquiryReplyFixture({ id: 1, mail_status: 'failed' })],
      }),
    );
    const user = userEvent.setup();
    customRenderAtRoute({ url: '/messages/7' });

    await user.click(await screen.findByRole('button', { name: 'Resend' }));

    expect(await screen.findByText('Sending')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Resend' })).not.toBeInTheDocument();
    expect(writes).toEqual([{ method: 'RESEND', body: null }]);
  });

  it('updates a Sending reply to Sent without a reload', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const detail = buildEnquiryDetailFixture({
        status: 'replied',
        replies: [buildEnquiryReplyFixture({ id: 1, mail_status: 'queued' })],
      });
      serveEnquiry(detail);
      customRenderAtRoute({ url: '/messages/7' });
      expect(await screen.findByText('Sending')).toBeVisible();

      server.use(
        http.get(mockEndpoints.enquiry, () =>
          HttpResponse.json({
            data: { ...detail, replies: [{ ...detail.replies[0], mail_status: 'sent' }] },
          }),
        ),
      );
      await vi.advanceTimersByTimeAsync(5_100);

      expect(await screen.findByText('Sent')).toBeVisible();
      expect(screen.queryByText('Sending')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('has no Resend button when every reply was delivered', async () => {
    serveEnquiry(
      buildEnquiryDetailFixture({
        status: 'replied',
        replies: [buildEnquiryReplyFixture({ mail_status: 'sent' })],
      }),
    );
    customRenderAtRoute({ url: '/messages/7' });

    await screen.findByText('Yes, we can make it in blue.');
    expect(screen.queryByRole('button', { name: 'Resend' })).not.toBeInTheDocument();
  });

  it('sends a reply, clears the box and marks the message Replied', async () => {
    const writes = serveEnquiry(buildEnquiryDetailFixture());
    const user = userEvent.setup();
    customRenderAtRoute({ url: '/messages/7' });

    const box = await screen.findByRole('textbox', { name: 'Reply' });
    await user.type(box, 'Yes, blue is fine.');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));

    expect(await screen.findByText('Yes, blue is fine.', { selector: 'p' })).toBeVisible();
    expect(screen.getByText('Replied')).toBeVisible();
    expect(box).toHaveValue('');
    expect(writes).toEqual([{ method: 'POST', body: { body: 'Yes, blue is fine.' } }]);
  });

  it('blocks an empty reply', async () => {
    const writes = serveEnquiry(buildEnquiryDetailFixture());
    const user = userEvent.setup();
    customRenderAtRoute({ url: '/messages/7' });

    await user.type(await screen.findByRole('textbox', { name: 'Reply' }), '   ');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));

    expect(await screen.findByText('Write a reply before sending.')).toBeVisible();
    expect(writes).toEqual([]);
  });

  it('keeps the reply text and shows the server message when sending fails', async () => {
    serveEnquiry(buildEnquiryDetailFixture());
    server.use(
      http.post(replyUrl, () =>
        HttpResponse.json(
          { message: 'Invalid.', errors: { body: ['The reply is too long.'] } },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    customRenderAtRoute({ url: '/messages/7' });

    const box = await screen.findByRole('textbox', { name: 'Reply' });
    await user.type(box, 'My answer');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));

    expect(await screen.findByText('The reply is too long.')).toBeVisible();
    expect(box).toHaveValue('My answer');
  });

  it('closes the message, then reopens it', async () => {
    const writes = serveEnquiry(buildEnquiryDetailFixture());
    const user = userEvent.setup();
    customRenderAtRoute({ url: '/messages/7' });

    await user.click(await screen.findByRole('button', { name: 'Close' }));
    expect(await screen.findByRole('button', { name: 'Reopen' })).toBeVisible();
    expect(screen.getByText('Closed')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(await screen.findByRole('button', { name: 'Close' })).toBeVisible();
    expect(screen.getByText('New')).toBeVisible();
    expect(writes).toEqual([
      { method: 'PATCH', body: { status: 'closed' } },
      { method: 'PATCH', body: { status: 'new' } },
    ]);
  });

  it('says the message changed on a 409', async () => {
    serveEnquiry(buildEnquiryDetailFixture());
    server.use(
      http.patch(mockEndpoints.enquiry, () =>
        HttpResponse.json({ message: 'Already closed.' }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    customRenderAtRoute({ url: '/messages/7' });

    await user.click(await screen.findByRole('button', { name: 'Close' }));

    expect(await screen.findByText('This message changed — showing the latest.')).toBeVisible();
  });

  it('says the message changed when a resend gets a 409', async () => {
    serveEnquiry(
      buildEnquiryDetailFixture({
        status: 'replied',
        replies: [buildEnquiryReplyFixture({ id: 1, mail_status: 'failed' })],
      }),
    );
    server.use(
      http.post(resendUrl, () =>
        HttpResponse.json({ message: 'Not failed any more.' }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    customRenderAtRoute({ url: '/messages/7' });

    await user.click(await screen.findByRole('button', { name: /^Resend/ }));

    expect(await screen.findByText('This message changed — showing the latest.')).toBeVisible();
  });

  it('drops an earlier action error when a later action succeeds', async () => {
    serveEnquiry(
      buildEnquiryDetailFixture({
        status: 'replied',
        replies: [buildEnquiryReplyFixture({ id: 1, mail_status: 'failed' })],
      }),
    );
    server.use(
      http.patch(mockEndpoints.enquiry, () =>
        HttpResponse.json({ message: 'Could not close.' }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    customRenderAtRoute({ url: '/messages/7' });

    await user.click(await screen.findByRole('button', { name: 'Close' }));
    expect(await screen.findByRole('alert')).toBeVisible();

    await user.click(screen.getByRole('button', { name: /^Resend/ }));

    expect(await screen.findByText('Sending')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('hides reply, close and resend without enquiries.manage', async () => {
    serveEnquiry(
      buildEnquiryDetailFixture({
        status: 'replied',
        replies: [buildEnquiryReplyFixture({ mail_status: 'failed' })],
      }),
      userWithoutManage(),
    );
    customRenderAtRoute({ url: '/messages/7' });

    expect(await screen.findByText('Not delivered')).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'Reply' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send reply' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resend' })).not.toBeInTheDocument();
  });

  it('shows Page not found for an unknown message', async () => {
    serveEnquiry(buildEnquiryDetailFixture());
    server.use(
      http.get(mockEndpoints.enquiry, () =>
        HttpResponse.json({ message: 'Not found.' }, { status: 404 }),
      ),
    );
    customRenderAtRoute({ url: '/messages/404' });

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Page not found' })).toBeVisible(),
    );
  });

  it('shows no access without enquiries.view', async () => {
    const user = buildUserFixture();
    serveEnquiry(
      buildEnquiryDetailFixture(),
      buildUserFixture({
        memberships: user.memberships.map((membership) => ({
          ...membership,
          permissions: membership.permissions.filter((slug) => !slug.startsWith('enquiries.')),
        })),
      }),
    );
    customRenderAtRoute({ url: '/messages/7' });

    expect(await screen.findByText("You don't have access to messages.")).toBeVisible();
  });
});
