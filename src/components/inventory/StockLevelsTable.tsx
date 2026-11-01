import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

import { type VariantStockLevel } from '@/types/catalogue';
import { ProductThumbnail } from '@/components/products/ProductThumbnail';
import { DataTable } from '@/components/ui/DataTable';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/utils/cn';
import { getStockStatus } from '@/utils/stockStatus';
import { getVariantLabel } from '@/utils/variantLabel';
import { buildStockVariantPath } from '@/constants/routes';

export function StockLevelsTable({
  levels,
  hasFilters,
}: {
  levels: VariantStockLevel[];
  hasFilters: boolean;
}) {
  const navigate = useNavigate();

  return (
    <DataTable
      caption="Stock"
      rows={levels}
      getRowKey={(level) => level.variant_id}
      onRowClick={(level) => navigate(buildStockVariantPath(level.variant_id))}
      empty={
        hasFilters
          ? 'No variants match. Try another filter.'
          : "No variants yet. They'll appear here once products are added."
      }
      columns={[
        {
          key: 'variant',
          header: 'Variant',
          render: (level) => (
            <div className="flex items-center gap-3">
              <ProductThumbnail image={level.image} />
              <div className="min-w-0">
                <Link
                  to={buildStockVariantPath(level.variant_id)}
                  // The row navigates on click as well; stop the click reaching it twice.
                  onClick={(event) => event.stopPropagation()}
                  className="font-medium text-text-primary no-underline hover:underline focus-visible:rounded-chip focus-visible:shadow-focus focus-visible:outline-none"
                >
                  {level.product_title}
                </Link>
                <div className="text-xs text-text-tertiary">
                  {level.is_default ? level.sku : getVariantLabel(level)}
                </div>
              </div>
            </div>
          ),
        },
        {
          key: 'available',
          header: 'Available',
          align: 'right',
          render: (level) => {
            const status = getStockStatus(level.stock.available);
            return (
              <span
                className={cn(
                  'font-semibold',
                  status === 'out' && 'text-danger-600',
                  status === 'low' && 'text-warning-700',
                )}
              >
                {level.stock.available}
              </span>
            );
          },
        },
        {
          key: 'on_hand',
          header: 'On hand',
          align: 'right',
          render: (level) => <span className="text-text-secondary">{level.stock.on_hand}</span>,
        },
        {
          key: 'held',
          header: 'Held',
          align: 'right',
          render: (level) =>
            level.stock.reserved > 0 ? (
              <span className="text-text-secondary">{level.stock.reserved}</span>
            ) : (
              <span className="text-text-tertiary">—</span>
            ),
        },
        {
          key: 'status',
          header: 'Status',
          render: (level) => (
            <StatusBadge kind="stock" status={getStockStatus(level.stock.available)} size="sm" />
          ),
        },
        {
          key: 'open',
          header: '',
          width: 40,
          render: () => <Icon icon={ChevronRight} className="text-text-tertiary" />,
        },
      ]}
    />
  );
}
