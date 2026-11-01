import { type Order } from '@/types/sales';
import { Card } from '@/components/ui/Card';
import { LifecycleStepper } from '@/components/ui/LifecycleStepper';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime } from '@/utils/movementTime';

// The furthest step the order reached; a cancelled order keeps the step it was cancelled at.
function getReachedStep(order: Order): number {
  if (order.completed_at) return 3;
  if (order.dispatched_at) return 2;
  if (order.confirmed_at) return 1;
  return 0;
}

function formatStepTime(iso: string | null): string | undefined {
  return iso ? formatDateTime(iso) : undefined;
}

export function OrderStatusCard({ order }: { order: Order }) {
  const steps = [
    { label: 'Pending', time: formatStepTime(order.created_at) },
    { label: 'Confirmed', time: formatStepTime(order.confirmed_at) },
    { label: 'Dispatched', time: formatStepTime(order.dispatched_at) },
    { label: 'Completed', time: formatStepTime(order.completed_at) },
  ];

  return (
    <Card className="mb-4">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex w-[150px] flex-col items-start gap-1.5">
          <span className="text-xs text-text-tertiary">Status</span>
          <StatusBadge kind="order" status={order.status} />
          {order.status === 'pending' && order.hold_expires_at ? (
            <span className="text-xs text-text-secondary">
              Stock held until {formatDateTime(order.hold_expires_at)}
            </span>
          ) : null}
        </div>
        <div role="group" aria-label="Order progress" className="min-w-[280px] flex-1">
          <LifecycleStepper
            steps={steps}
            current={getReachedStep(order)}
            cancelled={order.status === 'cancelled'}
          />
        </div>
      </div>
    </Card>
  );
}
