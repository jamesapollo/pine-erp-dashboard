import { cn } from '@/utils/cn';

export function StockCount({ value }: { value: number }) {
  return (
    <span
      className={cn(
        value <= 0 && 'font-semibold text-danger-600',
        value >= 1 && value <= 3 && 'font-semibold text-warning-700',
      )}
    >
      {value}
    </span>
  );
}
