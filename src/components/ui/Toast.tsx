import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';

import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

export type ToastTone = 'success' | 'danger' | 'warning' | 'info';

const toneIcons: Record<ToastTone, { icon: LucideIcon; className: string }> = {
  success: { icon: CircleCheck, className: 'text-success-500' },
  danger: { icon: CircleAlert, className: 'text-danger-500' },
  warning: { icon: TriangleAlert, className: 'text-warning-500' },
  info: { icon: Info, className: 'text-brand-300' },
};

export function Toast({
  tone = 'success',
  title,
  description,
  onClose,
}: {
  tone?: ToastTone;
  title: string;
  description?: string;
  onClose: () => void;
}) {
  const { icon, className } = toneIcons[tone];

  return (
    <div
      role="status"
      className="flex w-[360px] max-w-full items-start gap-2.5 rounded-[var(--radius-md)] bg-[var(--surface-inverse)] py-3 pl-3.5 pr-3 text-[length:var(--text-sm)] text-[var(--text-on-inverse)] shadow-lg"
    >
      <Icon icon={icon} size={18} className={cn('mt-px shrink-0', className)} />
      <div className="min-w-0">
        <div className="font-semibold text-white">{title}</div>
        {description ? <div className="mt-0.5 text-neutral-300">{description}</div> : null}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="ml-auto flex cursor-pointer rounded-chip border-0 bg-transparent p-0.5 text-neutral-400 hover:bg-white/10 hover:text-white focus-visible:shadow-focus focus-visible:outline-none"
      >
        <Icon icon={X} size={14} />
      </button>
    </div>
  );
}
