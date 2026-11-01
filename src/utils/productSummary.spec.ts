import { buildMoney, buildProductFixture, buildVariantFixture } from '@/tests/fixtures/catalogue';
import { summarizeProduct } from '@/utils/productSummary';

describe('summarizeProduct', () => {
  it('sums stock over every variant and shows a single price when nothing is overridden', () => {
    const product = buildProductFixture({
      variants: [
        buildVariantFixture({ id: 1, stock: { on_hand: 5, reserved: 2, available: 3 } }),
        buildVariantFixture({ id: 2, stock: { on_hand: 4, reserved: 0, available: 4 } }),
      ],
    });

    expect(summarizeProduct(product)).toEqual({
      onHand: 9,
      reserved: 2,
      outOfStockVariants: 0,
      priceRange: 'KES 4,500.00',
    });
  });

  it('shows a range when variants override the base price', () => {
    const product = buildProductFixture({
      variants: [
        buildVariantFixture({ id: 1 }),
        buildVariantFixture({
          id: 2,
          price: buildMoney('5200.00'),
          effective_price: buildMoney('5200.00'),
        }),
      ],
    });

    expect(summarizeProduct(product).priceRange).toBe('KES 4,500.00 – 5,200.00');
  });

  it('leaves inactive variants out of the price range and the out-of-stock count', () => {
    const product = buildProductFixture({
      variants: [
        buildVariantFixture({ id: 1, stock: { on_hand: 0, reserved: 0, available: 0 } }),
        buildVariantFixture({
          id: 2,
          is_active: false,
          effective_price: buildMoney('9000.00'),
          stock: { on_hand: 0, reserved: 0, available: 0 },
        }),
      ],
    });

    expect(summarizeProduct(product)).toEqual({
      onHand: 0,
      reserved: 0,
      outOfStockVariants: 1,
      priceRange: 'KES 4,500.00',
    });
  });

  it('shows a dash when no active variant has a price', () => {
    const product = buildProductFixture({
      price: null,
      variants: [buildVariantFixture({ effective_price: null })],
    });

    expect(summarizeProduct(product).priceRange).toBe('—');
  });
});
