import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type Enquiry } from '@/types/enquiry';
import { customRenderAtRoute } from '@/tests/customRender';
import { buildPaginated } from '@/tests/fixtures/catalogue';
import { buildEnquiryFixture } from '@/tests/fixtures/enquiries';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

function respondWithEnquiries(
  enquiries: Enquiry[],
  totals: Partial<Record<string, number>> = {},
  user = buildUserFixture(),
) {
  const requests: URLSearchParams[] = [];
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.enquiries, ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params);
      const total = totals[params.get('status') ?? 'all'] ?? enquiries.length;
      return HttpResponse.json(buildPaginated(enquiries, { total }));
    }),
  );
  return requests;
}

function listRequests(requests: URLSearchParams[]) {
  return requests.filter((params) => params.get('per_page') !== '1');
}

function buildUserWithoutEnquiries() {
  const user = buildUserFixture();
  return buildUserFixture({
    memberships: user.memberships.map((membership) => ({
      ...membership,
      permissions: membership.permissions.filter((slug) => !slug.startsWith('enquiries.')),
    })),
  });
}

describe('Messages list', () => {
  it('lists each message with sender, topic, first line, status and received time', async () => {
    respondWithEnquiries([buildEnquiryFixture({ id: 7 })]);
    customRenderAtRoute({ url: '/messages' });

    expect(await screen.findByRole('heading', { name: 'Messages' })).toBeVisible();
    const link = await screen.findByRole('link', { name: 'Amina Hassan' });
    expect(link).toHaveAttribute('href', '/messages/7');
    const row = within(link.closest('tr') as HTMLElement);
    expect(row.getByText('amina@example.com')).toBeVisible();
    expect(row.getByText('Custom order')).toBeVisible();
    expect(row.getByText('Hello, can you make this in blue?')).toBeVisible();
    expect(row.queryByText(/I need it by March/)).not.toBeInTheDocument();
    expect(row.getByText('New')).toBeVisible();
    expect(row.getByText('5 min ago')).toBeVisible();
  });

  it('shows a dash when there is no topic', async () => {
    respondWithEnquiries([buildEnquiryFixture({ topic: null })]);
    customRenderAtRoute({ url: '/messages' });

    const link = await screen.findByRole('link', { name: 'Amina Hassan' });
    expect(within(link.closest('tr') as HTMLElement).getByText('—')).toBeVisible();
  });

  it('opens the message when its row is clicked', async () => {
    respondWithEnquiries([buildEnquiryFixture({ id: 7 })]);
    const { router } = customRenderAtRoute({ url: '/messages' });

    await userEvent.click(await screen.findByText('Hello, can you make this in blue?'));

    await waitFor(() => expect(router.state.location.pathname).toBe('/messages/7'));
  });

  it('sets the status from the New, Replied, Closed and All tabs', async () => {
    const requests = respondWithEnquiries([buildEnquiryFixture()]);
    const { router } = customRenderAtRoute({ url: '/messages' });
    await screen.findByRole('link', { name: 'Amina Hassan' });

    for (const [tab, status] of [
      ['New', 'new'],
      ['Replied', 'replied'],
      ['Closed', 'closed'],
    ] as const) {
      await userEvent.click(screen.getByRole('tab', { name: tab }));
      await waitFor(() =>
        expect(listRequests(requests).some((params) => params.get('status') === status)).toBe(true),
      );
      expect(router.state.location.search).toBe(`?status=${status}`);
    }

    await userEvent.click(screen.getByRole('tab', { name: 'All' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
    // The unfiltered list is already cached from the first load, so no status is ever sent for it.
    expect(listRequests(requests)[0]?.has('status')).toBe(false);
  });

  it('searches after typing stops', async () => {
    const requests = respondWithEnquiries([buildEnquiryFixture()]);
    const { router } = customRenderAtRoute({ url: '/messages' });

    await screen.findByRole('link', { name: 'Amina Hassan' });
    await userEvent.type(screen.getByRole('textbox', { name: 'Search messages' }), 'amina');

    await waitFor(() =>
      expect(listRequests(requests).filter((params) => params.get('q') === 'amina')).toHaveLength(
        1,
      ),
    );
    expect(listRequests(requests).filter((params) => params.has('q'))).toHaveLength(1);
    expect(router.state.location.search).toBe('?q=amina');
  });

  it('pages through messages', async () => {
    server.use(
      http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })),
      http.get(mockEndpoints.enquiries, ({ request }) => {
        const params = new URL(request.url).searchParams;
        return HttpResponse.json(
          buildPaginated([buildEnquiryFixture()], {
            total: 30,
            last_page: 2,
            current_page: Number(params.get('page') ?? 1),
          }),
        );
      }),
    );
    const { router } = customRenderAtRoute({ url: '/messages' });

    expect(await screen.findByText('Showing 1–25 of 30')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(router.state.location.search).toBe('?page=2'));
    expect(await screen.findByText('Showing 26–30 of 30')).toBeVisible();
  });

  it('shows "No messages yet" on the unfiltered list', async () => {
    respondWithEnquiries([]);
    customRenderAtRoute({ url: '/messages' });

    expect(await screen.findByText(/^No messages yet/)).toBeVisible();
  });

  it('shows the empty view message on a filtered list', async () => {
    respondWithEnquiries([]);
    customRenderAtRoute({ url: '/messages?status=closed' });

    expect(await screen.findByText('No messages in this view.')).toBeVisible();
  });

  it('offers a retry when the list fails', async () => {
    let shouldFail = true;
    server.use(
      http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })),
      http.get(mockEndpoints.enquiries, ({ request }) => {
        if (shouldFail && new URL(request.url).searchParams.get('per_page') !== '1') {
          return HttpResponse.json({ message: 'Boom' }, { status: 500 });
        }
        return HttpResponse.json(buildPaginated([buildEnquiryFixture()]));
      }),
    );
    customRenderAtRoute({ url: '/messages' });

    expect(await screen.findByText("Couldn't load messages. Try again.")).toBeVisible();
    shouldFail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: 'Amina Hassan' })).toBeVisible();
  });
});

describe('Messages navigation', () => {
  it('shows Messages with the count of new messages', async () => {
    respondWithEnquiries([], { new: 3 });
    const { router } = customRenderAtRoute({ url: '/' });

    const navigation = await screen.findByRole('navigation', { name: 'Main' });
    const link = within(navigation).getByRole('link', { name: /^Messages/ });
    await waitFor(() => expect(link).toHaveAccessibleName('Messages, 3 new'));
    expect(within(link).getByText('3')).toBeVisible();

    await userEvent.click(link);
    await waitFor(() => expect(router.state.location.pathname).toBe('/messages'));
  });

  it('shows no count when there are no new messages', async () => {
    respondWithEnquiries([], { new: 0 });
    customRenderAtRoute({ url: '/' });

    const navigation = await screen.findByRole('navigation', { name: 'Main' });
    expect(await within(navigation).findByRole('link', { name: 'Messages' })).toBeVisible();
  });

  it('asks for new messages only, one per page, to get the count', async () => {
    const requests = respondWithEnquiries([], { new: 3 });
    customRenderAtRoute({ url: '/' });

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]?.get('status')).toBe('new');
    expect(requests[0]?.get('per_page')).toBe('1');
  });

  it('places Messages between Sales and Catalogue', async () => {
    respondWithEnquiries([]);
    customRenderAtRoute({ url: '/' });

    const navigation = await screen.findByRole('navigation', { name: 'Main' });
    const labels = within(navigation)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(labels.slice(0, 5)).toEqual([
      'Overview',
      'Orders',
      'Deliveries',
      'Messages',
      'Products',
    ]);
  });

  it('hides Messages and skips the count request without enquiries.view', async () => {
    const requests = respondWithEnquiries([], { new: 3 }, buildUserWithoutEnquiries());
    customRenderAtRoute({ url: '/messages' });

    expect(await screen.findByText("You don't have access to messages.")).toBeVisible();
    const navigation = screen.getByRole('navigation', { name: 'Main' });
    expect(within(navigation).queryByRole('link', { name: /Messages/ })).not.toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });
});
