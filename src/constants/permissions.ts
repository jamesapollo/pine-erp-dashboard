export const PERMISSION_GROUPS: { label: string; slugs: string[] }[] = [
  { label: 'Catalogue', slugs: ['catalogue.view', 'catalogue.manage'] },
  { label: 'Pricing', slugs: ['pricing.view', 'pricing.manage'] },
  { label: 'Inventory', slugs: ['inventory.view', 'inventory.manage'] },
  { label: 'Orders', slugs: ['orders.view', 'orders.manage', 'fulfilment.manage'] },
];

// Permissions the API manages itself, so a role editor never shows them.
export const HIDDEN_PERMISSION_SLUGS = ['store.view', 'staff.view', 'staff.manage'];

// Each manage permission and the view permission it needs.
export const PERMISSION_DEPENDENCIES: Record<string, string> = {
  'catalogue.manage': 'catalogue.view',
  'pricing.manage': 'pricing.view',
  'inventory.manage': 'inventory.view',
  'orders.manage': 'orders.view',
  'fulfilment.manage': 'orders.view',
};
