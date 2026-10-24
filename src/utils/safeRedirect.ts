export function getSafeRedirectPath(value: string | null): string {
  if (value === null || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/';
  }
  try {
    return new URL(value, window.location.origin).origin === window.location.origin ? value : '/';
  } catch {
    return '/';
  }
}
