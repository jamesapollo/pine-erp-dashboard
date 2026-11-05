import { type Offer } from '@/types/pricing';

export function buildOfferFixture(overrides: Partial<Offer> = {}): Offer {
  return {
    id: 1,
    name: 'Mashujaa Day sale',
    type: 'percent_off',
    value: '15.00',
    starts_at: '2026-10-20T00:00:00+00:00',
    ends_at: '2026-10-27T00:00:00+00:00',
    is_active: true,
    status: 'live',
    targets_count: 1,
    products: [],
    variants: [],
    categories: [{ id: 1, name: 'Dresses' }],
    created_at: '2026-10-01T09:00:00+00:00',
    updated_at: '2026-10-01T09:00:00+00:00',
    ...overrides,
  };
}
