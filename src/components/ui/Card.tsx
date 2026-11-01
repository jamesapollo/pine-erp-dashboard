import { type ReactNode } from 'react';

import { cn } from '@/utils/cn';

export function Card({
  title,
  subtitle,
  actions,
  footer,
  flush = false,
  className,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  flush?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const hasHead = Boolean(title || subtitle || actions);

  return (
    <section
      className={cn(
        'min-w-0 rounded-card border border-border-default bg-surface-card shadow-xs',
        className,
      )}
    >
      {hasHead ? (
        <header className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4">
          <div className="min-w-0">
            {title ? (
              <h3 className="m-0 text-[length:var(--text-md)] font-semibold leading-[1.3] tracking-[-0.01em] text-text-primary">
                {title}
              </h3>
            ) : null}
            {subtitle ? (
              <p className="m-0 mt-0.5 text-[length:var(--text-sm)] leading-[1.45] text-text-tertiary">
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={flush ? undefined : 'p-5'}>{children}</div>
      {footer ? (
        <footer className="flex items-center justify-end gap-2 rounded-b-card border-t border-border-subtle bg-surface-sunken px-5 py-3">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
