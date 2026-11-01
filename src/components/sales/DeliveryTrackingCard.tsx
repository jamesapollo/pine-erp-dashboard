import { type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';

import { type Delivery } from '@/types/sales';
import { DetailRow } from '@/components/sales/DetailRow';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { OrderRef } from '@/components/ui/OrderRef';
import { toSafeExternalUrl } from '@/utils/safeUrl';

// Courier deliveries only; a pickup has nothing to track.
export function DeliveryTrackingCard({
  delivery,
  actions,
}: {
  delivery: Delivery;
  actions?: ReactNode;
}) {
  const trackingUrl = toSafeExternalUrl(delivery.tracking_url);

  return (
    <Card title="Tracking" actions={actions}>
      <dl className="m-0">
        <DetailRow label="Courier">
          {delivery.courier_name ?? <span className="text-text-disabled">Not set</span>}
        </DetailRow>
        <DetailRow label="Tracking number">
          {delivery.tracking_number ? (
            <OrderRef value={delivery.tracking_number} plain />
          ) : (
            <span className="text-text-disabled">—</span>
          )}
        </DetailRow>
      </dl>
      {trackingUrl ? (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-text-link no-underline hover:underline"
        >
          Open tracking page
          <Icon icon={ExternalLink} size={13} />
        </a>
      ) : null}
    </Card>
  );
}
