import { getSafeRedirectPath } from '@/utils/safeRedirect';

describe('getSafeRedirectPath', () => {
  it('keeps a same-site path with its query', () => {
    expect(getSafeRedirectPath('/orders/42?tab=items')).toBe('/orders/42?tab=items');
  });

  it('keeps the accept-invite path with its token', () => {
    expect(getSafeRedirectPath('/accept-invite?token=abc123')).toBe('/accept-invite?token=abc123');
  });

  it.each([
    ['nothing', null],
    ['a protocol-relative url', '//evil.com'],
    ['an absolute url', 'https://evil.com'],
    ['a backslash path', '/\\evil.com'],
    ['a javascript url', 'javascript:alert(1)'],
    ['a relative path', 'orders'],
  ])('falls back to the overview for %s', (_label, value) => {
    expect(getSafeRedirectPath(value)).toBe('/');
  });
});
