import { type ReactNode } from 'react';

import { type Delivery } from '@/types/sales';
import { Card } from '@/components/ui/Card';
import { Timeline } from '@/components/ui/Timeline';
import { toDeliveryTimelineItems } from '@/utils/deliveryTimeline';

export function DeliveryTimelineCard({
  delivery,
  actions,
}: {
  delivery: Delivery;
  actions?: ReactNode;
}) {
  const items = toDeliveryTimelineItems(
    delivery.timeline,
    delivery.method,
    delivery.courier_name,
    delivery.tracking_number,
  );

  return (
    <Card title="Timeline" subtitle="Newest first" actions={actions}>
      <Timeline items={items} />
    </Card>
  );
}
