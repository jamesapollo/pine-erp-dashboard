import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';
import { useMatches } from 'react-router-dom';

import { type RouteHandle } from '@/types/routeHandle';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

function isRouteHandle(handle: unknown): handle is RouteHandle {
  return typeof handle === 'object' && handle !== null && 'crumbs' in handle;
}

export function Topbar() {
  const matches = useMatches();
  const deepestHandle = matches
    .map((match) => match.handle)
    .filter(isRouteHandle)
    .at(-1);
  // The product name for the trailing 'productName' crumb is wired in once the product query exists.
  const crumbs = deepestHandle?.crumbs ?? [];

  return (
    <header className="sticky top-0 z-10 flex h-topbar items-center gap-4 border-b border-border-default bg-white/85 px-8 backdrop-blur-[8px]">
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] font-medium leading-none text-text-tertiary"
      >
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={`${index}-${crumb}`}>
              {index > 0 ? <Icon icon={ChevronRight} size={14} className="shrink-0" /> : null}
              <span
                className={cn(
                  'min-w-0 truncate whitespace-nowrap',
                  isLast ? 'shrink text-text-primary' : 'shrink-0',
                )}
              >
                {crumb}
              </span>
            </Fragment>
          );
        })}
      </nav>
    </header>
  );
}
