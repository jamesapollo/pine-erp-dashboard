import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

import { Icon } from '@/components/ui/Icon';

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-card border border-border-default bg-surface-card px-5 py-[18px] shadow-xs">
      <div className="flex items-center gap-2 text-[length:var(--text-sm)] font-medium leading-[1.2] text-text-secondary">
        {icon ? <Icon icon={icon} /> : null}
        {label}
      </div>
      <div className="text-[length:var(--text-2xl)] font-semibold leading-[1.1] tracking-[-0.02em] tabular-nums text-text-primary">
        {value}
      </div>
      {hint ? <div className="text-xs leading-[1.4] text-text-tertiary">{hint}</div> : null}
    </div>
  );
}
