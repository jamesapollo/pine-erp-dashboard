// The store owner's role: it always has every permission, and is never edited or handed out.
export const OWNER_ROLE_SLUG = 'owner';

export const PERMISSION_GROUPS: { label: string; slugs: string[] }[] = [
  { label: 'Catalogue', slugs: ['catalogue.view', 'catalogue.manage'] },
  { label: 'Pricing', slugs: ['pricing.view', 'pricing.manage'] },
  { label: 'Inventory', slugs: ['inventory.view', 'inventory.manage'] },
  { label: 'Orders', slugs: ['orders.view', 'orders.manage', 'fulfilment.manage'] },
  { label: 'Enquiries', slugs: ['enquiries.view', 'enquiries.manage'] },
];

// Permissions the API manages itself, so a role editor never shows them.
export const HIDDEN_PERMISSION_SLUGS = ['store.view', 'store.manage', 'staff.view', 'staff.manage'];

// Each manage permission and the view permission it needs.
export const PERMISSION_DEPENDENCIES: Record<string, string> = {
  'catalogue.manage': 'catalogue.view',
  'pricing.manage': 'pricing.view',
  'inventory.manage': 'inventory.view',
  'orders.manage': 'orders.view',
  'fulfilment.manage': 'orders.view',
  'enquiries.manage': 'enquiries.view',
};
