import { type LucideIcon } from 'lucide-react';

export function Icon({
  icon: IconComponent,
  size = 16,
  className,
}: {
  icon: LucideIcon;
  size?: number;
  className?: string;
}) {
  return <IconComponent size={size} strokeWidth={1.75} aria-hidden className={className} />;
}
