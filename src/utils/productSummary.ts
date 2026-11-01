import { type Product } from '@/types/catalogue';
import { formatAmount, formatMoney } from '@/utils/money';

export type ProductSummary = {
  onHand: number;
  reserved: number;
  outOfStockVariants: number;
  priceRange: string;
};

// Stock sums over every variant; the out-of-stock count and price range only look at the
// variants buyers can pick (active ones).
export function summarizeProduct(product: Product): ProductSummary {
  const activeVariants = product.variants.filter((variant) => variant.is_active);
  const prices = activeVariants.flatMap((variant) =>
    variant.effective_price ? [variant.effective_price] : [],
  );
  const sortedPrices = [...prices].sort(
    (first, second) => Number(first.amount) - Number(second.amount),
  );
  const lowest = sortedPrices[0];
  const highest = sortedPrices.at(-1);

  let priceRange = '—';
  if (lowest && highest) {
    priceRange =
      Number(lowest.amount) === Number(highest.amount)
        ? formatMoney(lowest)
        : `${formatMoney(lowest)} – ${formatAmount(highest)}`;
  }

  return {
    onHand: product.variants.reduce((total, variant) => total + variant.stock.on_hand, 0),
    reserved: product.variants.reduce((total, variant) => total + variant.stock.reserved, 0),
    outOfStockVariants: activeVariants.filter((variant) => variant.stock.available <= 0).length,
    priceRange,
  };
}
