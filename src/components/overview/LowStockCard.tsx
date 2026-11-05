import { Link } from 'react-router-dom';
import { ArrowRight, PackageCheck } from 'lucide-react';

import { useStockLevelsQuery } from '@/hooks/api/queries/inventory/useStockLevelsQuery';
import { ProductThumbnail } from '@/components/products/ProductThumbnail';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { getStockStatus } from '@/utils/stockStatus';
import { getVariantLabel } from '@/utils/variantLabel';
import { LOW_STOCK_THRESHOLD } from '@/constants/stock';
import { buildStockVariantPath, ROUTES } from '@/constants/routes';

const SHOWN_VARIANTS = 6;

export function LowStockCard() {
  const stockQuery = useStockLevelsQuery({ status: 'low_or_out', perPage: SHOWN_VARIANTS });

  let content;
  if (stockQuery.isPending) {
    content = (
      <div className="flex justify-center p-6">
        <Spinner label="Loading stock" />
      </div>
    );
  } else if (stockQuery.isError) {
    content = (
      <div className="p-5">
        <Alert tone="danger">Couldn't load stock. Try again.</Alert>
      </div>
    );
  } else if (stockQuery.data.data.length === 0) {
    content = (
      <EmptyState
        icon={PackageCheck}
        title="Nothing running low"
        description={`Variants with ${LOW_STOCK_THRESHOLD} or fewer left show here.`}
      />
    );
  } else {
    content = (
      <ul aria-label="Low stock variants" className="m-0 list-none p-0">
        {stockQuery.data.data.map((level) => {
          const isOut = getStockStatus(level.stock.available) === 'out';
          return (
            <li key={level.variant_id} className="border-b border-border-subtle last:border-b-0">
              <Link
                to={buildStockVariantPath(level.variant_id)}
                className="flex items-center gap-3 px-5 py-3 text-text-primary no-underline hover:bg-surface-hover focus-visible:shadow-focus focus-visible:outline-none"
              >
                <ProductThumbnail image={level.image} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{level.product_title}</div>
                  <div className="truncate text-xs text-text-tertiary">
                    {level.is_default ? level.sku : getVariantLabel(level)}
                  </div>
                </div>
                <Badge size="sm" tone={isOut ? 'danger' : 'warning'}>
                  {isOut ? 'Out' : `${level.stock.available} left`}
                </Badge>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Card
      flush
      title="Low stock"
      subtitle={`${LOW_STOCK_THRESHOLD} or fewer units left`}
      actions={
        <ButtonLink to={`${ROUTES.STOCK}?status=low`}>
          Stock
          <Icon icon={ArrowRight} size={14} />
        </ButtonLink>
      }
    >
      {content}
    </Card>
  );
}
