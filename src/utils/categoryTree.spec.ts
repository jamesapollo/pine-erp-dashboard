import { buildCategoryFixture } from '@/tests/fixtures/catalogue';
import {
  flattenCategoryTree,
  getDescendantIds,
  getSubtreeHeight,
  slugify,
} from '@/utils/categoryTree';

const tree = [
  buildCategoryFixture({
    id: 2,
    name: 'Tops',
    sort_order: 1,
    children: [
      buildCategoryFixture({
        id: 5,
        parent_id: 2,
        name: 'Shirts',
        sort_order: 0,
        children: [buildCategoryFixture({ id: 7, parent_id: 5, name: 'Linen' })],
      }),
    ],
  }),
  buildCategoryFixture({
    id: 1,
    name: 'Dresses',
    sort_order: 0,
    children: [
      buildCategoryFixture({ id: 4, parent_id: 1, name: 'Zebra', sort_order: 1 }),
      buildCategoryFixture({ id: 3, parent_id: 1, name: 'Maxi', sort_order: 1 }),
      buildCategoryFixture({ id: 6, parent_id: 1, name: 'Party', sort_order: 0 }),
    ],
  }),
];

describe('categoryTree', () => {
  it('flattens depth-first ordered by sort order then name, with depth', () => {
    const rows = flattenCategoryTree(tree).map(({ category, depth }) => [category.name, depth]);

    expect(rows).toEqual([
      ['Dresses', 0],
      ['Party', 1],
      ['Maxi', 1],
      ['Zebra', 1],
      ['Tops', 0],
      ['Shirts', 1],
      ['Linen', 2],
    ]);
  });

  it('includes grandchildren in the descendants of a root', () => {
    expect(getDescendantIds(tree, 2).sort()).toEqual([5, 7]);
    expect(getDescendantIds(tree, 7)).toEqual([]);
  });
});

describe('getSubtreeHeight', () => {
  it('counts the levels below and including the category', () => {
    expect(getSubtreeHeight(tree, 2)).toBe(3);
    expect(getSubtreeHeight(tree, 1)).toBe(2);
    expect(getSubtreeHeight(tree, 7)).toBe(1);
    expect(getSubtreeHeight(tree, 99)).toBe(0);
  });
});

describe('slugify', () => {
  it('makes a lowercase hyphenated handle', () => {
    expect(slugify('  Kitenge & Ankara ')).toBe('kitenge-ankara');
    expect(slugify('Café Wear')).toBe('cafe-wear');
    expect(slugify('***')).toBe('');
  });
});
