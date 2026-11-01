import { useState } from 'react';
import { Plus } from 'lucide-react';

import { type Product, type ProductVariant } from '@/types/catalogue';
import { useStockMovementsQuery } from '@/hooks/api/queries/inventory/useStockMovementsQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Tabs } from '@/components/ui/Tabs';
import { AddVariantDialog } from '@/components/products/AddVariantDialog';
import { StockHistoryTab } from '@/components/products/StockHistoryTab';
import { VariantsTab } from '@/components/products/VariantsTab';

type ProductTab = 'variants' | 'stock';

/**
 * The detail page's tabbed card: the variants table (with Add variant) and, for users who can
 * see inventory, the stock history. The history loads the first time its tab opens.
 */
export function ProductVariantsCard({
  product,
  isReadOnly,
  onVariantSaved,
}: {
  product: Product;
  isReadOnly: boolean;
  onVariantSaved: (variant: ProductVariant) => Promise<void>;
}) {
  const { hasPermission } = useAuthedSession();
  const canSetPrices = hasPermission('pricing.manage');
  const canViewStock = hasPermission('inventory.view');
  const canRecordStock = hasPermission('inventory.manage');
  const [tab, setTab] = useState<ProductTab>('variants');
  const [hasOpenedHistory, setHasOpenedHistory] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [notice, setNotice] = useState<string>();

  const movementsQuery = useStockMovementsQuery(product.id, {
    isEnabled: canViewStock && hasOpenedHistory,
  });
  const canAddVariant = !isReadOnly && product.option_type_ids.length > 0;

  function changeTab(value: string) {
    const next: ProductTab = value === 'stock' && canViewStock ? 'stock' : 'variants';
    if (next === 'stock') setHasOpenedHistory(true);
    setTab(next);
  }

  const tabs = [
    { value: 'variants', label: 'Variants', count: product.variants.length },
    ...(canViewStock
      ? [
          {
            value: 'stock',
            label: 'Stock history',
            count: movementsQuery.data?.pages[0]?.meta.total,
          },
        ]
      : []),
  ];

  return (
    <Card flush>
      <div className="flex items-center justify-between gap-3 px-5">
        <Tabs label="Product sections" items={tabs} value={tab} onChange={changeTab} />
        {tab === 'variants' && canAddVariant ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setNotice(undefined);
              setIsAddOpen(true);
            }}
          >
            <Icon icon={Plus} size={14} />
            Add variant
          </Button>
        ) : null}
      </div>
      {notice ? (
        <div className="border-t border-border-subtle px-5 py-3">
          <Alert tone="danger">{notice}</Alert>
        </div>
      ) : null}
      {tab === 'variants' ? (
        <div role="tabpanel" aria-label="Variants">
          <VariantsTab
            product={product}
            isReadOnly={isReadOnly}
            canSetPrices={canSetPrices}
            onVariantSaved={onVariantSaved}
            onError={setNotice}
          />
        </div>
      ) : (
        <div role="tabpanel" aria-label="Stock history">
          <StockHistoryTab variants={product.variants} query={movementsQuery} />
        </div>
      )}
      {isAddOpen ? (
        <AddVariantDialog
          product={product}
          canSetPrices={canSetPrices}
          canRecordStock={canRecordStock}
          onVariantSaved={onVariantSaved}
          onStockFailed={setNotice}
          onClose={() => setIsAddOpen(false)}
        />
      ) : null}
    </Card>
  );
}
