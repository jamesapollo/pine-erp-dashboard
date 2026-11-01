import { useState } from 'react';
import { Link } from 'react-router-dom';

import { type StockMovement, type StockMovementType } from '@/types/catalogue';
import { useVariantStockMovementsQuery } from '@/hooks/api/queries/inventory/useVariantStockMovementsQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/utils/cn';
import { formatMovementTime } from '@/utils/movementTime';
import { buildOrderPath } from '@/constants/routes';

const TYPE_TABS: { value: 'all' | StockMovementType; label: string; emptyName: string }[] = [
  { value: 'all', label: 'All', emptyName: '' },
  { value: 'sale', label: 'Sales', emptyName: 'sale ' },
  { value: 'receipt', label: 'Receipts', emptyName: 'receipt ' },
  { value: 'adjustment', label: 'Adjustments', emptyName: 'adjustment ' },
  { value: 'return', label: 'Returns', emptyName: 'return ' },
];

function MovementDetails({ movement }: { movement: StockMovement }) {
  const { hasPermission } = useAuthedSession();
  if (movement.order_id !== null) {
    const orderLabel = `Order #${movement.order_id}`;
    return hasPermission('orders.view') ? (
      <Link
        to={buildOrderPath(movement.order_id)}
        className="font-medium text-text-link no-underline hover:underline"
      >
        {orderLabel}
      </Link>
    ) : (
      <span className="text-text-secondary">{orderLabel}</span>
    );
  }
  return movement.reason ? <>{movement.reason}</> : <span className="text-text-tertiary">—</span>;
}

const columns = [
  {
    key: 'when',
    header: 'When',
    render: (movement: StockMovement) => (
      <span className="whitespace-nowrap text-text-secondary">
        {formatMovementTime(movement.created_at)}
      </span>
    ),
  },
  {
    key: 'type',
    header: 'Type',
    render: (movement: StockMovement) => (
      <StatusBadge kind="movement" status={movement.type} size="sm" />
    ),
  },
  {
    key: 'details',
    header: 'Details',
    render: (movement: StockMovement) => <MovementDetails movement={movement} />,
  },
  {
    key: 'change',
    header: 'Change',
    align: 'right' as const,
    render: (movement: StockMovement) => (
      <span className={cn('font-semibold', movement.quantity > 0 && 'text-success-700')}>
        {movement.quantity > 0 ? `+${movement.quantity}` : `−${Math.abs(movement.quantity)}`}
      </span>
    ),
  },
  {
    key: 'after',
    header: 'On hand after',
    align: 'right' as const,
    render: (movement: StockMovement) => movement.on_hand_after,
  },
  {
    key: 'by',
    header: 'By',
    render: (movement: StockMovement) => (
      <span className="text-text-secondary">{movement.actor?.name ?? '—'}</span>
    ),
  },
];

/** Every change to the variant's on-hand stock, newest first, filtered by type. */
export function VariantTransactionsCard({ variantId }: { variantId: number }) {
  const [type, setType] = useState<'all' | StockMovementType>('all');
  const query = useVariantStockMovementsQuery(variantId, type === 'all' ? undefined : type);
  const emptyName = TYPE_TABS.find((tab) => tab.value === type)?.emptyName ?? '';

  let body;
  if (query.isPending) {
    body = (
      <div className="flex justify-center p-10 text-text-tertiary">
        <Spinner label="Loading transactions" />
      </div>
    );
  } else if (query.isError && !query.data) {
    body = (
      <div className="flex flex-col items-start gap-3 p-5">
        <Alert tone="danger">Couldn&apos;t load the transactions. Try again.</Alert>
        <Button variant="secondary" size="sm" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else {
    const movements = query.data.pages.flatMap((page) => page.data);
    body =
      movements.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-text-tertiary">
          No {emptyName}transactions yet.
        </div>
      ) : (
        <>
          <DataTable
            caption="Transactions"
            columns={columns}
            rows={movements}
            getRowKey={(movement) => movement.id}
          />
          {query.isFetchNextPageError ? (
            <div className="border-t border-border-subtle px-5 py-3">
              <Alert tone="danger">Couldn&apos;t load more transactions. Try again.</Alert>
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

  return (
    <Card
      title="Transactions"
      subtitle="Every change to on-hand stock for this variant"
      flush
      actions={
        <Tabs
          label="Transaction type"
          variant="pill"
          value={type}
          onChange={(value) => setType(value as 'all' | StockMovementType)}
          items={TYPE_TABS.map(({ value, label }) => ({ value, label }))}
        />
      }
    >
      {body}
    </Card>
  );
}
