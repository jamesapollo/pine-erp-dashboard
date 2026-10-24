import { cn } from '@/utils/cn';

export function Spinner({ label = 'Loading', className }: { label?: string; className?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent',
        className,
      )}
    />
  );
}
