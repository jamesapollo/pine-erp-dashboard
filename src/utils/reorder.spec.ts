import { buildOptionTypeFixture } from '@/tests/fixtures/catalogue';
import { getSortOrderChanges, moveItem } from '@/utils/reorder';

describe('reorder', () => {
  it('moves an item down and up without mutating the input', () => {
    const items = ['S', 'M', 'L'];

    expect(moveItem(items, 0, 1)).toEqual(['M', 'S', 'L']);
    expect(moveItem(items, 2, 1)).toEqual(['S', 'L', 'M']);
    expect(items).toEqual(['S', 'M', 'L']);
  });

  it('returns the same order for an out-of-range move', () => {
    expect(moveItem(['S', 'M'], 1, 2)).toEqual(['S', 'M']);
    expect(moveItem(['S', 'M'], 0, -1)).toEqual(['S', 'M']);
  });

  it('reports sort order changes only for values whose position changed', () => {
    const [small, medium, large] = buildOptionTypeFixture().values;

    expect(getSortOrderChanges([medium, small, large])).toEqual([
      { id: medium.id, sort_order: 0 },
      { id: small.id, sort_order: 1 },
    ]);
    expect(getSortOrderChanges([small, medium, large])).toEqual([]);
  });
});
