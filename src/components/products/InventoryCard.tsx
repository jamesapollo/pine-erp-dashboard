import { Card } from '@/components/ui/Card';
import { DetailRow } from '@/components/products/DetailRow';
import { StockCount } from '@/components/products/StockCount';
import { type ProductSummary } from '@/utils/productSummary';

const LOW_STOCK_THRESHOLD = 3;

export function InventoryCard({ summary }: { summary: ProductSummary }) {
  const { onHand, reserved, outOfStockVariants } = summary;

  return (
    <Card title="Inventory">
      <DetailRow label="On hand" value={<StockCount value={onHand} />} />
      <DetailRow label="Held in pending orders" value={reserved} />
      <DetailRow label="Out of stock variants" value={outOfStockVariants} />
      {onHand <= LOW_STOCK_THRESHOLD ? (
        <div className="mt-2 text-[13px] text-warning-700">
          {onHand <= 0
            ? 'Sold out — buyers see “Out of stock”.'
            : 'Running low. Record a receipt when new stock arrives.'}
        </div>
      ) : null}
    </Card>
  );
}
