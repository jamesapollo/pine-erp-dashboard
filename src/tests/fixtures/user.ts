import { type User } from '@/types/session';

export function buildUserFixture(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'Wanjiru Kamau',
    email: 'wanjiru@zion.co.ke',
    memberships: [
      {
        store: { id: 1, name: 'Zion', slug: 'zion' },
        roles: ['owner'],
        permissions: [
          'store.view',
          'catalogue.view',
          'catalogue.manage',
          'pricing.view',
          'pricing.manage',
          'inventory.view',
          'inventory.manage',
          'orders.view',
          'orders.manage',
          'fulfilment.manage',
          'staff.view',
          'staff.manage',
        ],
      },
    ],
    ...overrides,
  };
}
