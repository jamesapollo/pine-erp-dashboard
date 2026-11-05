import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/utils/cn';

const variantClasses = {
  secondary:
    'border-border-default bg-surface-card text-text-primary shadow-xs hover:border-border-strong hover:bg-surface-hover',
  ghost: 'bg-transparent text-text-secondary hover:bg-neutral-100 hover:text-text-primary',
} as const;

/** A router link that looks like a small Button, for navigation in card headers and footers. */
export function ButtonLink({
  to,
  variant = 'ghost',
  children,
}: {
  to: string;
  variant?: keyof typeof variantClasses;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex h-7 items-center justify-center gap-[5px] whitespace-nowrap rounded-control border border-transparent px-2.5 text-[13px] font-medium leading-none tracking-[-0.005em] no-underline transition duration-[120ms] ease-out focus-visible:shadow-focus focus-visible:outline-none',
        variantClasses[variant],
      )}
    >
      {children}
    </Link>
  );
}
