import { type ReactNode } from 'react';

import { cn } from '@/utils/cn';

// One label/value pair; render inside a <dl>.
export function DetailRow({
  label,
  children,
  isEmphasised = false,
}: {
  label: ReactNode;
  children: ReactNode;
  isEmphasised?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 py-1 text-[length:var(--text-base)]',
        isEmphasised && 'font-semibold',
      )}
    >
      <dt className={isEmphasised ? 'text-text-primary' : 'text-text-secondary'}>{label}</dt>
      <dd className="m-0 text-right tabular-nums">{children}</dd>
    </div>
  );
}
