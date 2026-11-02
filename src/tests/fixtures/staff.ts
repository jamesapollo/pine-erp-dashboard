import {
  type InvitationPreview,
  type Permission,
  type Role,
  type RoleDetail,
  type StaffMember,
} from '@/types/staff';

export function buildStaffMemberFixture(overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    id: 11,
    user_id: 21,
    name: 'Brian Mwangi',
    email: 'brian@zion.co.ke',
    status: 'active',
    is_owner: false,
    role: { id: 2, name: 'Manager', slug: 'manager', is_system: true },
    joined_at: '2026-09-01T08:00:00+00:00',
    last_active_at: '2026-11-01T10:30:00+00:00',
    invitation: null,
    ...overrides,
  };
}

export function buildRoleFixture(overrides: Partial<Role> = {}): Role {
  return {
    id: 2,
    name: 'Manager',
    slug: 'manager',
    description: 'Runs the catalogue, stock and orders.',
    is_system: true,
    permissions: ['store.view', 'catalogue.view', 'catalogue.manage', 'orders.view'],
    member_count: 1,
    ...overrides,
  };
}

export function buildRoleDetailFixture(overrides: Partial<RoleDetail> = {}): RoleDetail {
  return {
    ...buildRoleFixture(),
    members: [
      {
        member_id: 11,
        user_id: 21,
        name: 'Brian Mwangi',
        email: 'brian@zion.co.ke',
        status: 'active',
      },
    ],
    ...overrides,
  };
}

export function buildPermissionFixture(overrides: Partial<Permission> = {}): Permission {
  return {
    slug: 'catalogue.view',
    description: 'View products and categories.',
    ...overrides,
  };
}

export function buildInvitationPreviewFixture(
  overrides: Partial<InvitationPreview> = {},
): InvitationPreview {
  return {
    store: { name: 'Zion' },
    email: 'new.member@zion.co.ke',
    has_password: false,
    ...overrides,
  };
}
