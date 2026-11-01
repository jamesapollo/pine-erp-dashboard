import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Boxes, ClipboardCheck, Minus, Plus, ShoppingCart, Timer } from 'lucide-react';

import { type VariantStockLevel } from '@/types/catalogue';
import { useCategoriesQuery } from '@/hooks/api/queries/catalogue/useCategoriesQuery';
import { useStockLevelQuery } from '@/hooks/api/queries/inventory/useStockLevelQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { StockAdjustDialog } from '@/components/inventory/StockAdjustDialog';
import { type StockAdjustMode } from '@/components/inventory/stockAdjustSchema';
import { VariantTransactionsCard } from '@/components/inventory/VariantTransactionsCard';
import { Alert } from '@/components/ui/Alert';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { isStatus } from '@/utils/apiErrors';
import { flattenCategoryTree } from '@/utils/categoryTree';
import { getStockStatus, type StockStatus } from '@/utils/stockStatus';
import { getVariantLabel } from '@/utils/variantLabel';
import { LOW_STOCK_THRESHOLD } from '@/constants/stock';
import { ROUTES } from '@/constants/routes';

const AVAILABLE_HINTS: Record<StockStatus, string> = {
  out: 'Buyers see “Out of stock”',
  low: `Low — at or below ${LOW_STOCK_THRESHOLD}`,
  in_stock: 'In stock',
};

// Categories need catalogue.view; without it the subtitle shows the SKU alone.
function useCategoryNames(categoryIds: number[]): string[] {
  const { hasPermission } = useAuthedSession();
  const canViewCatalogue = hasPermission('catalogue.view');
  const categoriesQuery = useCategoriesQuery({ isEnabled: canViewCatalogue });
  if (!canViewCatalogue || !categoriesQuery.data) return [];
  const names = new Map(
    flattenCategoryTree(categoriesQuery.data).map(({ category }) => [category.id, category.name]),
  );
  return categoryIds.flatMap((id) => names.get(id) ?? []);
}

function StockVariantContent({ level }: { level: VariantStockLevel }) {
  const { hasPermission } = useAuthedSession();
  const canManage = hasPermission('inventory.manage');
  const [dialogMode, setDialogMode] = useState<StockAdjustMode | null>(null);
  const status = getStockStatus(level.stock.available);
  const categoryNames = useCategoryNames(level.category_ids);
  const isOffSale = level.product_status === 'archived' || !level.is_active;

  return (
    <>
      <PageHeader
        back={<BackLink to={ROUTES.STOCK}>Stock</BackLink>}
        title={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="whitespace-nowrap">{level.product_title}</span>{' '}
            {level.is_default ? null : (
              <span className="whitespace-nowrap font-normal text-text-tertiary">
                · {getVariantLabel(level)}
              </span>
            )}
          </span>
        }
        titleAside={<StatusBadge kind="stock" status={status} />}
        sub={[level.sku, ...categoryNames].join(' · ')}
        actions={
          canManage ? (
            <>
              <Button variant="secondary" onClick={() => setDialogMode('remove')}>
                <Icon icon={Minus} />
                Remove
              </Button>
              <Button variant="secondary" onClick={() => setDialogMode('count')}>
                <Icon icon={ClipboardCheck} />
                Set count
              </Button>
              <Button onClick={() => setDialogMode('receipt')}>
                <Icon icon={Plus} />
                Receive stock
              </Button>
            </>
          ) : null
        }
      />
      {isOffSale ? (
        <div className="mb-4">
          <Alert tone="info">
            {level.product_status === 'archived'
              ? 'This product is archived, so this variant isn’t on sale.'
              : 'This variant is turned off, so it isn’t on sale.'}
          </Alert>
        </div>
      ) : null}
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <StatCard
          label="Available to sell"
          value={level.stock.available}
          hint={AVAILABLE_HINTS[status]}
          icon={ShoppingCart}
        />
        <StatCard
          label="On hand"
          value={level.stock.on_hand}
          hint="physically in store"
          icon={Boxes}
        />
        <StatCard
          label="Held for orders"
          value={level.stock.reserved}
          hint={level.stock.reserved > 0 ? 'in pending orders' : 'nothing held'}
          icon={Timer}
        />
      </div>
      <VariantTransactionsCard variantId={level.variant_id} />
      {dialogMode ? (
        <StockAdjustDialog
          level={level}
          initialMode={dialogMode}
          onClose={() => setDialogMode(null)}
        />
      ) : null}
    </>
  );
}

export function StockVariantPage() {
  const { variantId = '' } = useParams();
  const levelQuery = useStockLevelQuery(Number(variantId));

  if (levelQuery.isError) {
    if (isStatus(levelQuery.error, 404)) return <NotFoundPage />;
    if (isStatus(levelQuery.error, 403)) {
      return (
        <>
          <PageHeader title="Stock" />
          <NoAccess message="You don't have access to stock." />
        </>
      );
    }
    return (
      <>
        <PageHeader title="Stock" />
        <div className="flex flex-col items-start gap-3">
          <Alert tone="danger">Couldn&apos;t load this variant. Try again.</Alert>
          <Button variant="secondary" onClick={() => levelQuery.refetch()}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  if (levelQuery.isPending) {
    return (
      <div className="flex justify-center p-10 text-text-tertiary">
        <Spinner label="Loading variant" />
      </div>
    );
  }

  return <StockVariantContent level={levelQuery.data} />;
}
