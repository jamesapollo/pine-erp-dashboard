import { Fragment } from 'react';
import { useMatches } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

import { type RouteHandle } from '@/types/routeHandle';
import { useProductQuery } from '@/hooks/api/queries/catalogue/useProductQuery';
import { useDeliveryQuery } from '@/hooks/api/queries/sales/useDeliveryQuery';
import { useOrderQuery } from '@/hooks/api/queries/sales/useOrderQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

function isRouteHandle(handle: unknown): handle is RouteHandle {
  return typeof handle === 'object' && handle !== null && 'crumbs' in handle;
}

function isDigits(value: string | undefined): value is string {
  return value !== undefined && /^\d+$/.test(value);
}

export function Topbar() {
  const matches = useMatches();
  const { hasPermission } = useAuthedSession();
  const deepestMatch = matches.filter((match) => isRouteHandle(match.handle)).at(-1);
  const deepestHandle = isRouteHandle(deepestMatch?.handle) ? deepestMatch.handle : undefined;

  // A product, order or delivery route whose id isn't a number renders "Page not found", so its
  // crumb says so too.
  const trailingCrumb = deepestHandle?.trailingCrumb;
  const productIdParam = deepestMatch?.params.productId;
  const hasProductCrumb = trailingCrumb === 'productName';
  const isValidProductId = isDigits(productIdParam);
  const shouldLoadProduct = hasProductCrumb && isValidProductId && hasPermission('catalogue.view');
  const productQuery = useProductQuery(shouldLoadProduct ? Number(productIdParam) : Number.NaN);

  const orderIdParam = deepestMatch?.params.orderId;
  const hasOrderCrumb = trailingCrumb === 'orderReference';
  const isValidOrderId = isDigits(orderIdParam);
  const shouldLoadOrder = hasOrderCrumb && isValidOrderId && hasPermission('orders.view');
  const orderQuery = useOrderQuery(shouldLoadOrder ? Number(orderIdParam) : Number.NaN);

  const deliveryIdParam = deepestMatch?.params.deliveryId;
  const hasDeliveryCrumb = trailingCrumb === 'deliveryReference';
  const isValidDeliveryId = isDigits(deliveryIdParam);
  const shouldLoadDelivery = hasDeliveryCrumb && isValidDeliveryId && hasPermission('orders.view');
  const deliveryQuery = useDeliveryQuery(shouldLoadDelivery ? Number(deliveryIdParam) : Number.NaN);

  let crumbs = deepestHandle?.crumbs ?? [];
  if (
    (hasProductCrumb && !isValidProductId) ||
    (hasOrderCrumb && !isValidOrderId) ||
    (hasDeliveryCrumb && !isValidDeliveryId)
  ) {
    crumbs = ['Page not found'];
  } else if (hasProductCrumb && productQuery.data) {
    crumbs = [...crumbs, productQuery.data.title];
  } else if (hasOrderCrumb && orderQuery.data) {
    crumbs = [...crumbs, orderQuery.data.reference];
  } else if (hasDeliveryCrumb && deliveryQuery.data) {
    crumbs = [...crumbs, deliveryQuery.data.order_reference];
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
