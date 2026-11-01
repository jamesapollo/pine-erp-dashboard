import { type StockStatusFilter } from '@/hooks/api/queryKeys';
import { LOW_STOCK_THRESHOLD } from '@/constants/stock';

export type StockStatus = 'in_stock' | 'low' | 'out';

/** Out at 0 or below (backordered counts as out), low up to the threshold, in stock above it. */
export function getStockStatus(available: number): StockStatus {
  if (available <= 0) return 'out';
  return available <= LOW_STOCK_THRESHOLD ? 'low' : 'in_stock';
}

/** The available range the stock list asks the API for, per status tab. */
export function getAvailableRange(status: StockStatusFilter): {
  available_min?: number;
  available_max: number;
} {
  return status === 'out'
    ? { available_max: 0 }
    : { available_min: 1, available_max: LOW_STOCK_THRESHOLD };
}
