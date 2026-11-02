import { countVisiblePermissions, togglePermission } from '@/utils/rolePermissions';

describe('togglePermission', () => {
  it('adds the view permission when a manage permission is ticked', () => {
    expect(togglePermission([], 'catalogue.manage', true)).toEqual([
      'catalogue.view',
      'catalogue.manage',
    ]);
  });

  it('adds orders.view when fulfilment.manage is ticked', () => {
    expect(togglePermission([], 'fulfilment.manage', true)).toEqual([
      'orders.view',
      'fulfilment.manage',
    ]);
  });

  it('removes the manage permissions that depend on an unticked view permission', () => {
    expect(
      togglePermission(['orders.view', 'orders.manage', 'fulfilment.manage'], 'orders.view', false),
    ).toEqual([]);
  });

  it('keeps the view permission when its manage permission is unticked', () => {
    expect(
      togglePermission(['catalogue.view', 'catalogue.manage'], 'catalogue.manage', false),
    ).toEqual(['catalogue.view']);
  });

  it('returns the permissions in group order', () => {
    expect(togglePermission(['orders.view', 'catalogue.view'], 'inventory.view', true)).toEqual([
      'catalogue.view',
      'inventory.view',
      'orders.view',
    ]);
  });
});

describe('countVisiblePermissions', () => {
  it('does not count hidden permissions', () => {
    expect(countVisiblePermissions(['store.view', 'orders.view'])).toBe(1);
  });
});
