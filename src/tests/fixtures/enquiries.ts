import { type Enquiry, type EnquiryDetail, type EnquiryReply } from '@/types/enquiry';

export function buildEnquiryFixture(overrides: Partial<Enquiry> = {}): Enquiry {
  return {
    id: 7,
    name: 'Amina Hassan',
    email: 'amina@example.com',
    topic: 'Custom order',
    message: 'Hello, can you make this in blue?\nI need it by March.',
    status: 'new',
    last_replied_at: null,
    closed_at: null,
    created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    ...overrides,
  };
}

export function buildEnquiryReplyFixture(overrides: Partial<EnquiryReply> = {}): EnquiryReply {
  return {
    id: 21,
    author_name: 'Wanjiru Kamau',
    body: 'Yes, we can make it in blue.',
    mail_status: 'sent',
    sent_at: new Date(Date.now() - 60 * 60_000).toISOString(),
    created_at: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
    ...overrides,
  };
}

export function buildEnquiryDetailFixture(overrides: Partial<EnquiryDetail> = {}): EnquiryDetail {
  return { ...buildEnquiryFixture(), replies: [], ...overrides };
}
