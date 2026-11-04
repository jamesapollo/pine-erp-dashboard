import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type ContactDetails } from '@/types/contactDetails';
import { customRenderAtRoute } from '@/tests/customRender';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

const OWNER = buildUserFixture({
  memberships: [
    {
      store: { id: 1, name: 'Zion', slug: 'zion' },
      roles: ['owner'],
      permissions: ['store.view', 'store.manage'],
    },
  ],
});
const VIEWER = buildUserFixture({
  memberships: [
    {
      store: { id: 1, name: 'Zion', slug: 'zion' },
      roles: ['viewer'],
      permissions: ['store.view'],
    },
  ],
});

const SAVED: ContactDetails = {
  email: 'hello@zion.co.ke',
  phone: '+254700000000',
  whatsapp: null,
  address_line: '12 Kimathi Street',
  city: 'Nairobi',
  country_code: 'KE',
  opening_hours: 'Mon – Sat, 9am – 6pm EAT',
  visit_note: null,
  social_links: {
    instagram: 'https://instagram.com/zion',
    tiktok: null,
    pinterest: null,
    facebook: null,
    x: null,
    youtube: null,
  },
  enquiry_topics: ['General', 'Returns', 'Press'],
};

function respondWith(user = OWNER, details: ContactDetails = SAVED) {
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.contactDetails, () => HttpResponse.json({ data: details })),
  );
}

function recordSaves(status = 200, body?: unknown) {
  const bodies: ContactDetails[] = [];
  server.use(
    http.put(mockEndpoints.contactDetails, async ({ request }) => {
      const sent = (await request.json()) as ContactDetails;
      bodies.push(sent);
      return HttpResponse.json(body ?? { data: sent }, { status });
    }),
  );
  return bodies;
}

async function openPage() {
  customRenderAtRoute({ url: '/contact-details' });
  return screen.findByLabelText('Email');
}

function topicNames() {
  return within(screen.getByRole('list', { name: 'Enquiry topics' }))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('[data-topic-name]')?.textContent);
}

describe('Contact details', () => {
  it('loads the saved details into the form', async () => {
    respondWith();
    await openPage();

    expect(screen.getByLabelText('Email')).toHaveValue('hello@zion.co.ke');
    expect(screen.getByLabelText('Phone')).toHaveValue('+254700000000');
    expect(screen.getByLabelText('City')).toHaveValue('Nairobi');
    expect(screen.getByLabelText('Instagram')).toHaveValue('https://instagram.com/zion');
    expect(screen.getByLabelText('WhatsApp')).toHaveValue('');
    expect(topicNames()).toEqual(['General', 'Returns', 'Press']);
    expect(screen.getByText(/Changes show on the website within about 5 minutes\./)).toBeVisible();
  });

  it('shows a one-line preview from phone, email and place', async () => {
    respondWith();
    await openPage();

    expect(screen.getByText('+254700000000 · hello@zion.co.ke · Nairobi, KE')).toBeVisible();

    await userEvent.clear(screen.getByLabelText('Phone'));
    expect(screen.getByText('hello@zion.co.ke · Nairobi, KE')).toBeVisible();
  });

  it('rejects a phone number that is not in international format', async () => {
    respondWith();
    const bodies = recordSaves();
    await openPage();

    await userEvent.clear(screen.getByLabelText('Phone'));
    await userEvent.type(screen.getByLabelText('Phone'), '0700 000 000');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Use international format, e.g. +254700000000')).toBeVisible();
    expect(bodies).toEqual([]);
  });

  it('rejects a social link that does not start with https://', async () => {
    respondWith();
    const bodies = recordSaves();
    await openPage();

    await userEvent.clear(screen.getByLabelText('Facebook'));
    await userEvent.type(screen.getByLabelText('Facebook'), 'http://facebook.com/zion');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Use a link starting with https://')).toBeVisible();
    expect(bodies).toEqual([]);
  });

  it('adds, moves and removes topics, and stops at ten', async () => {
    respondWith();
    await openPage();

    const input = screen.getByLabelText('New topic');
    await userEvent.type(input, 'Wholesale');
    await userEvent.click(screen.getByRole('button', { name: 'Add topic' }));
    expect(topicNames()).toEqual(['General', 'Returns', 'Press', 'Wholesale']);
    expect(input).toHaveValue('');

    await userEvent.click(screen.getByRole('button', { name: 'Move Wholesale up' }));
    expect(topicNames()).toEqual(['General', 'Returns', 'Wholesale', 'Press']);

    await userEvent.click(screen.getByRole('button', { name: 'Remove Returns' }));
    expect(topicNames()).toEqual(['General', 'Wholesale', 'Press']);

    for (const name of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
      await userEvent.type(input, name);
      await userEvent.click(screen.getByRole('button', { name: 'Add topic' }));
    }
    expect(topicNames()).toHaveLength(10);
    await userEvent.type(input, 'H');
    expect(screen.getByRole('button', { name: 'Add topic' })).toBeDisabled();
  });

  it('refuses a duplicate topic, ignoring case', async () => {
    respondWith();
    await openPage();

    await userEvent.type(screen.getByLabelText('New topic'), 'returns');
    await userEvent.click(screen.getByRole('button', { name: 'Add topic' }));

    expect(await screen.findByText('That topic is already in the list')).toBeVisible();
    expect(topicNames()).toEqual(['General', 'Returns', 'Press']);
  });

  it('saves the full object, sending empty fields as null', async () => {
    respondWith();
    const bodies = recordSaves();
    await openPage();

    await userEvent.type(screen.getByLabelText('WhatsApp'), '+254711111111');
    await userEvent.clear(screen.getByLabelText('City'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      ...SAVED,
      whatsapp: '+254711111111',
      city: null,
    });
    expect(await screen.findByText('Contact details saved')).toBeVisible();
  });

  it('is read-only without store.manage', async () => {
    respondWith(VIEWER);
    await openPage();

    expect(screen.getByLabelText('Email')).toBeDisabled();
    expect(screen.getByLabelText('Instagram')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('New topic')).not.toBeInTheDocument();
  });

  it('maps a 422 to the field and keeps what was typed', async () => {
    respondWith();
    recordSaves(422, {
      message: 'The email field must be a valid email address.',
      errors: { email: ['The email field must be a valid email address.'] },
    });
    await openPage();

    await userEvent.clear(screen.getByLabelText('City'));
    await userEvent.type(screen.getByLabelText('City'), 'Mombasa');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    const email = screen.getByLabelText('Email');
    await waitFor(() => expect(email).toHaveAccessibleDescription(/must be a valid email/));
    expect(screen.getByLabelText('City')).toHaveValue('Mombasa');
  });

  it('shows the server message on a 403 and keeps the input', async () => {
    respondWith();
    recordSaves(403, { message: 'This action is unauthorized.' });
    await openPage();

    await userEvent.clear(screen.getByLabelText('City'));
    await userEvent.type(screen.getByLabelText('City'), 'Mombasa');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText("You don't have permission to do that.")).toBeVisible();
    expect(screen.getByLabelText('City')).toHaveValue('Mombasa');
  });

  it('shows no access to someone without store.view', async () => {
    respondWith(
      buildUserFixture({
        memberships: [
          { store: { id: 1, name: 'Zion', slug: 'zion' }, roles: ['staff'], permissions: [] },
        ],
      }),
    );
    customRenderAtRoute({ url: '/contact-details' });

    expect(await screen.findByText("You don't have access to contact details.")).toBeVisible();
  });
});

describe('Contact details in the sidebar', () => {
  it('links to the page for someone with store.view', async () => {
    respondWith(VIEWER);
    customRenderAtRoute({ url: '/' });

    expect(await screen.findByRole('link', { name: 'Contact details' })).toHaveAttribute(
      'href',
      '/contact-details',
    );
  });
});
