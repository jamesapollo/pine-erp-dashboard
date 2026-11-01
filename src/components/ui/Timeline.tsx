import { type LucideIcon } from 'lucide-react';

import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

export type TimelineItem = {
  id: string;
  title: string;
  time?: string;
  meta?: string;
  note?: string;
  tone?: 'filled' | 'success' | 'danger' | 'warning' | 'info';
  icon?: LucideIcon;
};

const dotToneClasses = {
  filled: 'bg-action-primary text-white shadow-none',
  success: 'bg-success-600 text-white shadow-none',
  danger: 'bg-danger-600 text-white shadow-none',
  warning: 'bg-warning-500 text-white shadow-none',
  info: 'bg-info-600 text-white shadow-none',
} as const;

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {items.map((item) => (
        <li
          key={item.id}
          className="relative grid grid-cols-[20px_1fr] gap-3 pb-[18px] before:absolute before:bottom-[-2px] before:left-[9.5px] before:top-4 before:w-px before:bg-border-default before:content-[''] last:pb-0 last:before:hidden"
        >
          <span
            className={cn(
              'relative z-[1] flex size-5 items-center justify-center rounded-full bg-surface-card text-text-tertiary shadow-[inset_0_0_0_1.5px_var(--border-strong)]',
              item.tone ? dotToneClasses[item.tone] : null,
            )}
          >
            {item.icon ? <Icon icon={item.icon} size={11} /> : null}
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[length:var(--text-base)] font-medium leading-[1.35] text-text-primary">
                {item.title}
              </span>
              {item.time ? (
                <span className="whitespace-nowrap text-[length:var(--text-xs)] leading-[1.35] text-text-tertiary tabular-nums">
                  {item.time}
                </span>
              ) : null}
            </div>
            {item.meta ? (
              <div className="mt-0.5 text-[length:var(--text-xs)] text-text-tertiary">
                {item.meta}
              </div>
            ) : null}
            {item.note ? (
              <div className="mt-2 rounded-[var(--radius-sm)] border border-border-subtle bg-surface-sunken px-2.5 py-2 text-[length:var(--text-sm)] text-text-secondary">
                {item.note}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
