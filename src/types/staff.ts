export type StaffStatus = 'invited' | 'active' | 'suspended';

export type StaffRoleSummary = {
  id: number;
  name: string;
  slug: string;
  is_system: boolean;
};

export type StaffInvitation = {
  sent_at: string;
  expires_at: string;
  invited_by_name: string | null;
};

// `id` is the membership id.
export type StaffMember = {
  id: number;
  user_id: number;
  name: string;
  email: string;
  status: StaffStatus;
  is_owner: boolean;
  role: StaffRoleSummary | null;
  joined_at: string | null;
  last_active_at: string | null;
  invitation: StaffInvitation | null;
};

export type Role = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
  permissions: string[];
  member_count: number;
};

export type RoleMember = {
  member_id: number;
  user_id: number;
  name: string;
  email: string;
  status: StaffStatus;
};

export type RoleDetail = Role & { members: RoleMember[] };

export type Permission = {
  slug: string;
  description: string;
};

export type InvitationPreview = {
  store: { name: string };
  email: string;
  has_password: boolean;
};
