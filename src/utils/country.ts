const regionNames = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
// ICU names the reserved code "ZZ" this way instead of rejecting it.
const UNKNOWN_REGION_NAME = 'Unknown Region';

/** "Kenya" for "KE"; the code itself when it is not a known region. */
export function formatCountry(code: string): string {
  try {
    const name = regionNames.of(code);
    return name && name !== UNKNOWN_REGION_NAME ? name : code;
  } catch {
    return code;
  }
}
