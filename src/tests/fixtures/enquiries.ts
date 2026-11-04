import { type Enquiry } from '@/types/enquiry';

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
