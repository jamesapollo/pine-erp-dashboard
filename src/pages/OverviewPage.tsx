import { Inbox } from 'lucide-react';

import { useStockSummaryQuery } from '@/hooks/api/queries/inventory/useStockSummaryQuery';
import { useSalesPipelineCountsQuery } from '@/hooks/api/queries/sales/useSalesPipelineCountsQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { LowStockCard } from '@/components/overview/LowStockCard';
import { NeedsConfirmingCard } from '@/components/overview/NeedsConfirmingCard';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { getGreeting } from '@/utils/greeting';

function formatCount(count: number | undefined): string {
  return count === undefined ? '—' : count.toLocaleString();
}

function describeWaitingOrders(count: number | undefined): string | undefined {
  if (count === undefined) return undefined;
  if (count === 0) return 'No orders are waiting for you to confirm.';
  return count === 1
    ? '1 order is waiting for you to confirm.'
    : `${count.toLocaleString()} orders are waiting for you to confirm.`;
}

export function OverviewPage() {
  const { user, hasPermission } = useAuthedSession();
  const canViewOrders = hasPermission('orders.view');
  const canViewStock = hasPermission('inventory.view');
  const pipeline = useSalesPipelineCountsQuery({ enabled: canViewOrders });

  return (
    <div>
      <PageHeader
        title={getGreeting(user.name)}
        sub={canViewOrders ? describeWaitingOrders(pipeline.awaitingConfirmation) : undefined}
      />
      {canViewOrders || canViewStock ? (
        <>
          <section
            aria-label="Summary"
            className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {canViewOrders ? (
              <>
                <StatCard
                  label="Awaiting confirmation"
                  value={formatCount(pipeline.awaitingConfirmation)}
                  hint="Placed on the website"
                />
                <StatCard
                  label="Ready to dispatch"
                  value={formatCount(pipeline.readyToDispatch)}
                  hint="Confirmed, not yet sent"
                />
                <StatCard
                  label="Out for delivery"
                  value={formatCount(pipeline.outForDelivery)}
                  hint={
                    pipeline.failedDeliveries
                      ? `${pipeline.failedDeliveries.toLocaleString()} failed, need attention`
                      : 'Dispatched or in transit'
                  }
                />
              </>
            ) : null}
            {canViewStock ? <LowStockStat /> : null}
          </section>
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            {canViewOrders ? <NeedsConfirmingCard /> : null}
            {canViewStock ? <LowStockCard /> : null}
          </div>
        </>
      ) : (
        <Card>
          <EmptyState icon={Inbox} title="Nothing here yet" />
        </Card>
      )}
    </div>
  );
}

// Its own component so the stock queries only run for someone who can see stock.
function LowStockStat() {
  const { counts } = useStockSummaryQuery();
  const lowOrOut =
    counts.low === undefined || counts.out === undefined ? undefined : counts.low + counts.out;
  return (
    <StatCard
      label="Low stock"
      value={formatCount(lowOrOut)}
      hint={counts.out === undefined ? undefined : `${counts.out.toLocaleString()} out of stock`}
    />
  );
}
