import { type Category } from '@/types/catalogue';

function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort(
    (first, second) =>
      first.sort_order - second.sort_order || first.name.localeCompare(second.name),
  );
}

export function flattenCategoryTree(tree: Category[]): { category: Category; depth: number }[] {
  const rows: { category: Category; depth: number }[] = [];
  function visit(categories: Category[], depth: number) {
    for (const category of sortCategories(categories)) {
      rows.push({ category, depth });
      visit(category.children ?? [], depth + 1);
    }
  }
  visit(tree, 0);
  return rows;
}

export function getDescendantIds(tree: Category[], categoryId: number): number[] {
  const rows = flattenCategoryTree(tree);
  const start = rows.findIndex(({ category }) => category.id === categoryId);
  if (start === -1) return [];
  const startDepth = rows[start].depth;
  const descendantIds: number[] = [];
  for (let index = start + 1; index < rows.length && rows[index].depth > startDepth; index += 1) {
    descendantIds.push(rows[index].category.id);
  }
  return descendantIds;
}

export function indentCategoryLabel(name: string, depth: number): string {
  return `${'  '.repeat(depth)}${name}`;
}

// Special categories (New In, On Sale) are filled automatically, so they hold no products and can't
// be assigned or filtered by.
export function flattenStandardCategories(tree: Category[]) {
  return flattenCategoryTree(tree).filter(({ category }) => category.kind === 'standard');
}

// How many levels the category's subtree spans; a category with no subcategories is 1.
export function getSubtreeHeight(tree: Category[], categoryId: number): number {
  const rows = flattenCategoryTree(tree);
  const start = rows.findIndex(({ category }) => category.id === categoryId);
  if (start === -1) return 0;
  const startDepth = rows[start].depth;
  let deepest = startDepth;
  for (let index = start + 1; index < rows.length && rows[index].depth > startDepth; index += 1) {
    deepest = Math.max(deepest, rows[index].depth);
  }
  return deepest - startDepth + 1;
}

// The URL handle the API would make from a name: lowercase letters and digits joined by hyphens.
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
