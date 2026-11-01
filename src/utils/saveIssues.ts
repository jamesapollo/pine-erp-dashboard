export type SaveIssues = {
  variants: number;
  stock: number;
  images: number;
  publish: boolean;
  message: string;
};

function pluralise(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}

// The sentence shown on a product's page when Add product created it but a later step failed.
export function formatSaveIssues(issues: SaveIssues): string {
  const message = issues.message.trim().replace(/\.+$/, '');
  const parts: string[] = [];
  if (issues.variants > 0) parts.push(pluralise(issues.variants, 'variant', 'variants'));
  if (issues.stock > 0) {
    parts.push(`opening stock for ${pluralise(issues.stock, 'variant', 'variants')}`);
  }
  if (issues.images > 0) parts.push(pluralise(issues.images, 'image', 'images'));

  if (parts.length === 0) return `Saved as a draft, but it couldn't be published: ${message}.`;
  const nextStep = issues.publish ? 'Add them below, then publish.' : 'Add them below.';
  return `Saved as a draft, but ${joinList(parts)} didn't save: ${message}. ${nextStep}`;
}
