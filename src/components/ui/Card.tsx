import { type ReactNode } from 'react';

import { cn } from '@/utils/cn';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-card border border-border-default bg-surface-card shadow-xs',
        className,
      )}
    >
      {children}
    </section>
  );
}
