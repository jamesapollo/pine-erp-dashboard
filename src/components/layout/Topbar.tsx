import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';
import { useMatches } from 'react-router-dom';

import { useProductQuery } from '@/hooks/api/queries/catalogue/useProductQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';

import { type RouteHandle } from '@/types/routeHandle';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

function isRouteHandle(handle: unknown): handle is RouteHandle {
  return typeof handle === 'object' && handle !== null && 'crumbs' in handle;
}

export function Topbar() {
  const matches = useMatches();
  const { hasPermission } = useAuthedSession();
  const deepestMatch = matches.filter((match) => isRouteHandle(match.handle)).at(-1);
  const deepestHandle = isRouteHandle(deepestMatch?.handle) ? deepestMatch.handle : undefined;

  // A product route whose id isn't a number renders "Page not found", so its crumb says so too.
  const productIdParam = deepestMatch?.params.productId;
  const hasProductCrumb = deepestHandle?.trailingCrumb === 'productName';
  const isValidProductId = productIdParam !== undefined && /^\d+$/.test(productIdParam);
  const shouldLoadProduct = hasProductCrumb && isValidProductId && hasPermission('catalogue.view');
  const productQuery = useProductQuery(shouldLoadProduct ? Number(productIdParam) : Number.NaN);

  let crumbs = deepestHandle?.crumbs ?? [];
  if (hasProductCrumb && !isValidProductId) {
    crumbs = ['Page not found'];
  } else if (hasProductCrumb && productQuery.data) {
    crumbs = [...crumbs, productQuery.data.title];
  }

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
