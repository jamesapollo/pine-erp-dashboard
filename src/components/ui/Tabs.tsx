import { useRef, type KeyboardEvent } from 'react';

import { cn } from '@/utils/cn';

export function Tabs({
  items,
  value,
  onChange,
  variant = 'line',
  label,
}: {
  items: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (value: string) => void;
  variant?: 'line' | 'pill';
  label: string;
}) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isPill = variant === 'pill';

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const nextIndex = (index + step + items.length) % items.length;
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'flex',
        isPill
          ? 'inline-flex gap-0.5 rounded-[8px] bg-neutral-100 p-[3px]'
          : 'gap-5 border-b border-border-default',
      )}
    >
      {items.map((item, index) => {
        const isActive = item.value === value;

        return (
          <button
            key={item.value}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'relative inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 font-medium leading-none transition-colors duration-[120ms] ease-out hover:text-text-primary focus-visible:rounded-chip focus-visible:shadow-focus focus-visible:outline-none',
              isPill
                ? 'h-7 rounded-control px-3 text-[length:var(--text-sm)]'
                : 'h-10 text-[length:var(--text-base)]',
              isActive ? 'text-text-primary' : 'text-text-secondary',
              isActive && isPill && 'bg-surface-card shadow-sm',
              isActive &&
                !isPill &&
                "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-t-[2px] after:bg-action-primary after:content-['']",
            )}
          >
            {item.label}
            {item.count != null ? (
              <span
                className={cn(
                  'inline-flex h-[18px] min-w-5 items-center justify-center rounded-full px-1.5 text-[length:var(--text-2xs)] font-medium leading-none tabular-nums',
                  isActive ? 'bg-brand-50 text-brand-700' : 'bg-neutral-100 text-text-secondary',
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
