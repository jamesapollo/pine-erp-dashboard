import { buildOptionTypeFixture } from '@/tests/fixtures/catalogue';
import { buildVariantCombinations } from '@/utils/variantCombinations';

const size = buildOptionTypeFixture();
const colour = buildOptionTypeFixture({
  id: 2,
  name: 'Colour',
  values: [
    { id: 11, option_type_id: 2, value: 'Red', sort_order: 1, is_active: true, variants_count: 0 },
    { id: 10, option_type_id: 2, value: 'Blue', sort_order: 0, is_active: true, variants_count: 0 },
  ],
});

describe('buildVariantCombinations', () => {
  it('builds one row per combination in option-type order', () => {
    expect(
      buildVariantCombinations([
        { optionType: size, valueIds: [2, 1] },
        { optionType: colour, valueIds: [11] },
      ]),
    ).toEqual([
      { key: '1-11', label: 'S · Red', optionValueIds: [1, 11] },
      { key: '2-11', label: 'M · Red', optionValueIds: [2, 11] },
    ]);
  });

  it('orders values by their sort order and varies the first type slowest', () => {
    expect(
      buildVariantCombinations([
        { optionType: colour, valueIds: [11, 10] },
        { optionType: size, valueIds: [1, 2] },
      ]).map((combination) => combination.label),
    ).toEqual(['Blue · S', 'Blue · M', 'Red · S', 'Red · M']);
  });

  it('gives a single default row without option types', () => {
    expect(buildVariantCombinations([])).toEqual([
      { key: 'default', label: 'Default', optionValueIds: [] },
    ]);
  });

  it('gives no rows while a chosen type has no values picked', () => {
    expect(buildVariantCombinations([{ optionType: size, valueIds: [] }])).toEqual([]);
  });
});
