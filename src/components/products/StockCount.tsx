import { cn } from '@/utils/cn';
import { getStockStatus } from '@/utils/stockStatus';

export function StockCount({ value }: { value: number }) {
  const status = getStockStatus(value);
  return (
    <span
      className={cn(
        status === 'out' && 'font-semibold text-danger-600',
        status === 'low' && 'font-semibold text-warning-700',
      )}
    >
      {value}
    </span>
  );
}
