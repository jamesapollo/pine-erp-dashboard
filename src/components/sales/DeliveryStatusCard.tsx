import { type Delivery } from '@/types/sales';
import { DetailRow } from '@/components/sales/DetailRow';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime } from '@/utils/movementTime';

const METHOD_LABELS = { courier: 'Courier', pickup: 'Pickup' } as const;

function formatOptionalTime(iso: string | null) {
  return iso ? formatDateTime(iso) : <span className="text-text-disabled">—</span>;
}

export function DeliveryStatusCard({ delivery }: { delivery: Delivery }) {
  const isPickup = delivery.method === 'pickup';

  return (
    <Card
      title="Status"
      actions={
        <StatusBadge kind="delivery" status={delivery.status} label={delivery.status_label} />
      }
    >
      <dl className="m-0">
        <DetailRow label="Method">{METHOD_LABELS[delivery.method]}</DetailRow>
        <DetailRow label="Dispatched">{formatOptionalTime(delivery.dispatched_at)}</DetailRow>
        {delivery.status === 'delivered' ? (
          <DetailRow label={isPickup ? 'Collected' : 'Delivered'}>
            {formatOptionalTime(delivery.delivered_at)}
          </DetailRow>
        ) : null}
        {delivery.status === 'returned' ? (
          <DetailRow label="Returned">{formatOptionalTime(delivery.returned_at)}</DetailRow>
        ) : null}
        {delivery.status === 'cancelled' ? (
          <DetailRow label="Cancelled">{formatOptionalTime(delivery.cancelled_at)}</DetailRow>
        ) : null}
      </dl>
    </Card>
  );
}
