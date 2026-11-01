import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Icon } from '@/components/ui/Icon';

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="mb-2.5 inline-flex items-center gap-1 rounded-chip text-[13px] font-medium leading-none text-text-secondary no-underline hover:text-text-primary focus-visible:shadow-focus focus-visible:outline-none"
    >
      <Icon icon={ArrowLeft} size={14} />
      {children}
    </Link>
  );
}
