import { buildVariantFixture } from '@/tests/fixtures/catalogue';
import { getVariantLabel } from '@/utils/variantLabel';

describe('getVariantLabel', () => {
  it('joins the option values', () => {
    expect(
      getVariantLabel(
        buildVariantFixture({
          is_default: false,
          option_values: [
            { option_type_id: 1, option_value_id: 1, value: 'S' },
            { option_type_id: 2, option_value_id: 11, value: 'Red' },
          ],
        }),
      ),
    ).toBe('S · Red');
  });

  it('calls the default variant Default', () => {
    expect(getVariantLabel(buildVariantFixture())).toBe('Default');
  });

  it('calls a variant without option values Default', () => {
    expect(getVariantLabel(buildVariantFixture({ is_default: false, option_values: [] }))).toBe(
      'Default',
    );
  });
});
