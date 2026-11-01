const SAFE_PROTOCOLS = new Set(['https:', 'http:']);

/** The URL's normalised href when it is a web link, otherwise null (scripts, data, garbage). */
export function toSafeExternalUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return SAFE_PROTOCOLS.has(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}
