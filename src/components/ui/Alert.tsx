import { type ReactNode } from 'react';

import { cn } from '@/utils/cn';

const toneClasses = {
  info: 'bg-info-50 text-info-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
} as const;

export function Alert({
  tone,
  children,
}: {
  tone: 'info' | 'success' | 'warning' | 'danger';
  children: ReactNode;
}) {
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={cn('rounded-control px-3 py-2.5 text-[13px] leading-[1.45]', toneClasses[tone])}
    >
      {children}
    </div>
  );
}
