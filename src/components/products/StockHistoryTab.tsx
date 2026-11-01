import { type InfiniteData, type UseInfiniteQueryResult } from '@tanstack/react-query';

import {
  type Paginated,
  type ProductVariant,
  type StockMovement,
  type StockMovementType,
} from '@/types/catalogue';
import { Alert } from '@/components/ui/Alert';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { OrderRef } from '@/components/ui/OrderRef';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/utils/cn';
import { formatMovementTime } from '@/utils/movementTime';
import { getVariantLabel } from '@/utils/variantLabel';

const typeTones: Record<StockMovementType, BadgeTone> = {
  sale: 'neutral',
  receipt: 'success',
  return: 'info',
  adjustment: 'warning',
};

const typeLabels: Record<StockMovementType, string> = {
  sale: 'Sale',
  receipt: 'Receipt',
  return: 'Return',
  adjustment: 'Adjustment',
};

function MovementBy({ movement }: { movement: StockMovement }) {
  if (movement.order_id !== null) return <OrderRef value={`Order #${movement.order_id}`} plain />;
  return <>{movement.actor?.name ?? '—'}</>;
}

/** The product's stock movements, newest first, a page at a time. */
export function StockHistoryTab({
  variants,
  query,
}: {
  variants: ProductVariant[];
  query: UseInfiniteQueryResult<InfiniteData<Paginated<StockMovement>>>;
}) {
  if (query.isPending) {
    return (
      <div className="flex justify-center p-10 text-text-tertiary">
        <Spinner label="Loading stock history" />
      </div>
    );
  }

  // A failed "Load more" keeps the rows already shown; only a failed first page replaces them.
  if (query.isError && !query.data) {
    return (
      <div className="flex flex-col items-start gap-3 p-5">
        <Alert tone="danger">Couldn&apos;t load the stock history. Try again.</Alert>
        <Button variant="secondary" size="sm" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const movements = query.data.pages.flatMap((page) => page.data);
  if (movements.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-sm text-text-tertiary">
        No stock movements yet.
      </div>
    );
  }

  const variantLabels = new Map(variants.map((variant) => [variant.id, getVariantLabel(variant)]));
  const columns = [
    {
      key: 'when',
      header: 'When',
      render: (movement: StockMovement) => (
        <span className="whitespace-nowrap">{formatMovementTime(movement.created_at)}</span>
      ),
    },
    {
      key: 'variant',
      header: 'Variant',
      render: (movement: StockMovement) => (
        <span className="whitespace-nowrap">{variantLabels.get(movement.variant_id) ?? '—'}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (movement: StockMovement) => (
        <Badge size="sm" tone={typeTones[movement.type]}>
          {typeLabels[movement.type]}
        </Badge>
      ),
    },
    {
      key: 'change',
      header: 'Change',
      align: 'right' as const,
      render: (movement: StockMovement) => (
        <span className={cn(movement.quantity > 0 && 'text-brand-700')}>
          {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
        </span>
      ),
    },
    {
      key: 'after',
      header: 'After',
      align: 'right' as const,
      render: (movement: StockMovement) => movement.on_hand_after,
    },
    {
      key: 'by',
      header: 'By',
      render: (movement: StockMovement) => <MovementBy movement={movement} />,
    },
  ];

  return (
    <>
      <DataTable
        caption="Stock history"
        columns={columns}
        rows={movements}
        getRowKey={(movement) => movement.id}
      />
      {query.isFetchNextPageError ? (
        <div className="border-t border-border-subtle px-5 py-3">
          <Alert tone="danger">Couldn&apos;t load more stock movements. Try again.</Alert>
        </div>
      ) : null}
      {query.hasNextPage ? (
        <div className="flex justify-center border-t border-border-subtle px-5 py-3">
          <Button
            variant="secondary"
            size="sm"
            isLoading={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </>
  );
}
