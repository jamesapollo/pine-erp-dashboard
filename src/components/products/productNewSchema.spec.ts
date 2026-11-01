import { productNewDefaultValues, productNewSchema } from '@/components/products/productNewSchema';

describe('Add product schema', () => {
  it('rejects a chosen option with no values picked', () => {
    const result = productNewSchema('draft').safeParse({
      ...productNewDefaultValues,
      title: 'Ankara wrap dress',
      optionTypeIds: [1, 2],
      selectedValueIds: { 1: [3], 2: [] },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ['optionTypeIds'],
        message: 'Pick at least one value for each option.',
      }),
    ]);
  });

  it('accepts options that each have a value', () => {
    const result = productNewSchema('draft').safeParse({
      ...productNewDefaultValues,
      title: 'Ankara wrap dress',
      optionTypeIds: [1],
      selectedValueIds: { 1: [3] },
    });

    expect(result.success).toBe(true);
  });
});
