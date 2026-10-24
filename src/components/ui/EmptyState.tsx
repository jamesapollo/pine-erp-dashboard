import { type LucideIcon } from 'lucide-react';

import { Icon } from '@/components/ui/Icon';

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-10 text-center">
      <div className="mb-2 flex size-11 items-center justify-center rounded-dialog bg-neutral-100 text-text-secondary">
        <Icon icon={icon} size={22} />
      </div>
      <div className="text-base font-semibold text-text-primary">{title}</div>
      {description ? (
        <div className="max-w-[340px] text-[13px] text-text-tertiary">{description}</div>
      ) : null}
    </div>
  );
}
