import { cn } from '@/utils/cn';

export function OrderRef({ value, plain = false }: { value: string; plain?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap font-mono text-[length:var(--text-sm)] font-medium leading-none tracking-[0.02em] text-text-primary',
        !plain && 'h-6 rounded-chip bg-neutral-100 px-2',
      )}
    >
      {value}
    </span>
  );
}
