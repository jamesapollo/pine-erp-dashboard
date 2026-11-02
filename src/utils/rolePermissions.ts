import {
  HIDDEN_PERMISSION_SLUGS,
  PERMISSION_DEPENDENCIES,
  PERMISSION_GROUPS,
} from '@/constants/permissions';

const orderedSlugs = PERMISSION_GROUPS.flatMap((group) => group.slugs);

// Adds or removes a permission and keeps the view-before-manage dependencies valid. The result follows
// PERMISSION_GROUPS order, with any slug outside the groups (such as a hidden one) kept at the end.
export function togglePermission(selected: string[], slug: string, isChecked: boolean): string[] {
  const next = new Set(selected);

  if (isChecked) {
    next.add(slug);
    const requiredSlug = PERMISSION_DEPENDENCIES[slug];
    if (requiredSlug) next.add(requiredSlug);
  } else {
    next.delete(slug);
    for (const [dependentSlug, requiredSlug] of Object.entries(PERMISSION_DEPENDENCIES)) {
      if (requiredSlug === slug) next.delete(dependentSlug);
    }
  }

  const grouped = orderedSlugs.filter((orderedSlug) => next.has(orderedSlug));
  const others = [...next].filter((otherSlug) => !orderedSlugs.includes(otherSlug));
  return [...grouped, ...others];
}

export function countVisiblePermissions(slugs: string[]): number {
  return slugs.filter((slug) => !HIDDEN_PERMISSION_SLUGS.includes(slug)).length;
}
