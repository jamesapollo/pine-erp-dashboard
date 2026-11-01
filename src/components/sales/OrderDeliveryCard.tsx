import { useNavigate } from 'react-router-dom';

import { type Order } from '@/types/sales';
import { DetailRow } from '@/components/sales/DetailRow';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OrderRef } from '@/components/ui/OrderRef';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { toSafeExternalUrl } from '@/utils/safeUrl';
import { buildDeliveryPath } from '@/constants/routes';

const METHOD_LABELS = { courier: 'Courier', pickup: 'Pickup' } as const;

function Dash() {
  return <span className="text-text-disabled">—</span>;
}

export function OrderDeliveryCard({ order }: { order: Order }) {
  const navigate = useNavigate();
  const { delivery } = order;
  const trackingUrl = toSafeExternalUrl(delivery?.tracking_url ?? null);

  if (!delivery) {
    return (
      <Card title="Delivery">
        <p className="m-0 text-sm text-text-secondary">
          No delivery yet. It&apos;s created when you dispatch the order.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title="Delivery"
      actions={
        <StatusBadge kind="delivery" status={delivery.status} label={delivery.status_label} />
      }
    >
      <dl className="m-0">
        <DetailRow label="Method">{METHOD_LABELS[delivery.method]}</DetailRow>
        <DetailRow label="Courier">{delivery.courier_name ?? <Dash />}</DetailRow>
        <DetailRow label="Tracking">
          {delivery.tracking_number && trackingUrl ? (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-link no-underline hover:underline"
            >
              <OrderRef value={delivery.tracking_number} plain />
            </a>
          ) : delivery.tracking_number ? (
            <OrderRef value={delivery.tracking_number} plain />
          ) : (
            <Dash />
          )}
        </DetailRow>
        <DetailRow label="Zone">{order.delivery_charge.zone_name ?? <Dash />}</DetailRow>
      </dl>
      <Button
        variant="ghost"
        size="sm"
        className="mt-3"
        onClick={() => navigate(buildDeliveryPath(delivery.id))}
      >
        Open delivery
      </Button>
    </Card>
  );
}
