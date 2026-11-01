import { cn } from '@/utils/cn';

const sizeClasses = {
  md: 'text-[length:var(--text-sm)]',
  lg: 'text-[length:var(--text-lg)]',
} as const;

const chipSizeClasses = { md: 'h-6 px-2', lg: 'h-8 px-2.5' } as const;

export function OrderRef({
  value,
  plain = false,
  size = 'md',
}: {
  value: string;
  plain?: boolean;
  size?: 'md' | 'lg';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap font-mono font-medium leading-none tracking-[0.02em] text-text-primary',
        sizeClasses[size],
        !plain && ['rounded-chip bg-neutral-100', chipSizeClasses[size]],
      )}
    >
      {value}
    </span>
  );
}
