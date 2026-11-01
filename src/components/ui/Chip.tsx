import { type ReactNode } from 'react';
import { Check } from 'lucide-react';

import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

export function Chip({
  isSelected,
  onClick,
  children,
}: {
  isSelected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className={cn(
        'inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium leading-none transition duration-[120ms] ease-out focus-visible:shadow-focus focus-visible:outline-none',
        isSelected
          ? 'border-brand-600 bg-brand-50 text-brand-800'
          : 'border-border-default bg-surface-card text-text-secondary hover:border-border-strong',
      )}
    >
      {isSelected ? <Icon icon={Check} size={13} /> : null}
      {children}
    </button>
  );
}
