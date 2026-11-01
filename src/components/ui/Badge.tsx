import { type ReactNode } from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '@/utils/cn';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'clay';

const badgeVariants = cva(
  'inline-flex items-center whitespace-nowrap rounded-chip font-medium leading-none',
  {
    variants: {
      tone: {
        neutral: 'bg-[var(--status-neutral-bg)] text-[color:var(--status-neutral-fg)]',
        primary: 'bg-[var(--status-primary-bg)] text-[color:var(--status-primary-fg)]',
        success: 'bg-[var(--status-success-bg)] text-[color:var(--status-success-fg)]',
        warning: 'bg-[var(--status-warning-bg)] text-[color:var(--status-warning-fg)]',
        danger: 'bg-[var(--status-danger-bg)] text-[color:var(--status-danger-fg)]',
        info: 'bg-[var(--status-info-bg)] text-[color:var(--status-info-fg)]',
        clay: 'bg-[var(--status-clay-bg)] text-[color:var(--status-clay-fg)]',
      },
      size: {
        sm: 'h-[18px] gap-[5px] px-1.5 text-[length:var(--text-2xs)]',
        md: 'h-[22px] gap-1.5 px-2 text-[length:var(--text-xs)]',
      },
    },
  },
);

const dotClasses: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--status-neutral-dot)]',
  primary: 'bg-[var(--status-primary-dot)]',
  success: 'bg-[var(--status-success-dot)]',
  warning: 'bg-[var(--status-warning-dot)]',
  danger: 'bg-[var(--status-danger-dot)]',
  info: 'bg-[var(--status-info-dot)]',
  clay: 'bg-[var(--status-clay-dot)]',
};

export function Badge({
  tone = 'neutral',
  size = 'md',
  dot = false,
  children,
}: {
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={cn(badgeVariants({ tone, size }))}>
      {dot ? (
        <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', dotClasses[tone])} />
      ) : null}
      {children}
    </span>
  );
}
