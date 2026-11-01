import { type Order } from '@/types/sales';
import { Card } from '@/components/ui/Card';
import { Timeline } from '@/components/ui/Timeline';
import { buildOrderActivity } from '@/utils/orderActivity';

export function OrderActivityCard({ order }: { order: Order }) {
  return (
    <Card title="Activity">
      <Timeline items={buildOrderActivity(order)} />
    </Card>
  );
}
