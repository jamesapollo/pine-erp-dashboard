import { buildMoney, buildProductFixture, buildVariantFixture } from '@/tests/fixtures/catalogue';
import {
  buildProductChanges,
  buildVariantPriceChanges,
  productDetailDefaultValues,
} from '@/components/products/productDetailSchema';

const product = buildProductFixture({
  variants: [
    buildVariantFixture({ id: 4 }),
    buildVariantFixture({ id: 9, price: buildMoney('5200.00') }),
  ],
});
const saved = productDetailDefaultValues(product);

describe('product detail changes', () => {
  it('sends nothing when only the price format changed', () => {
    const input = { ...saved, basePrice: '4,500', variantPrices: { 4: '', 9: '5200' } };

    expect(buildProductChanges(input, saved, { canSetPrices: true })).toEqual({});
    expect(
      buildVariantPriceChanges(input, saved, { canSetPrices: true, variantIds: [4, 9] }),
    ).toEqual([]);
  });

  it('sends changed variant prices in variant order, null when cleared', () => {
    const input = { ...saved, variantPrices: { 4: '4800', 9: '' } };

    expect(
      buildVariantPriceChanges(input, saved, { canSetPrices: true, variantIds: [9, 4] }),
    ).toEqual([
      { variantId: 9, price: null },
      { variantId: 4, price: '4800.00' },
    ]);
  });

  it('never includes a price without pricing.manage', () => {
    const input = { ...saved, basePrice: '9000', variantPrices: { 4: '4800', 9: '' } };

    expect(buildProductChanges(input, saved, { canSetPrices: false })).toEqual({});
    expect(
      buildVariantPriceChanges(input, saved, { canSetPrices: false, variantIds: [4, 9] }),
    ).toEqual([]);
  });

  it('sends a cleared description as null and the category as a one-item list', () => {
    const withDescription = { ...saved, description: 'Cotton', categoryId: undefined };
    const input = { ...withDescription, description: '  ', categoryId: 3 };

    expect(buildProductChanges(input, withDescription, { canSetPrices: true })).toEqual({
      description: null,
      category_ids: [3],
    });
  });
});
