export type StoreSummary = { id: number; name: string; slug: string };

export type Membership = {
  store: StoreSummary;
  roles: string[];
  permissions: string[];
};

export type User = {
  id: number;
  name: string;
  email: string;
  memberships: Membership[];
};

export type Session =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'anon' }
  | { status: 'no-store'; user: User }
  | {
      status: 'authed';
      user: User;
      store: StoreSummary;
      roles: string[];
      permissions: string[];
      hasPermission: (slug: string) => boolean;
    };
