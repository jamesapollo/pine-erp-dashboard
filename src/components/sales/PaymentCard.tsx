import { type Order } from '@/types/sales';
import { DetailRow } from '@/components/sales/DetailRow';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';

// Payment is agreed with the buyer offline: unpaid until the order is confirmed, arranged after.
function getPaymentStatus(order: Order): 'unpaid' | 'arranged' | null {
  if (order.status === 'cancelled') return null;
  return order.status === 'pending' ? 'unpaid' : 'arranged';
}

export function PaymentCard({ order }: { order: Order }) {
  const paymentStatus = getPaymentStatus(order);

  return (
    <Card title="Payment">
      {paymentStatus ? (
        <dl className="m-0">
          <DetailRow label="Status">
            <StatusBadge kind="payment" status={paymentStatus} />
          </DetailRow>
        </dl>
      ) : null}
      <p className="m-0 mt-2 text-[13px] text-text-tertiary first:mt-0">
        Online payment isn&apos;t enabled for this store yet. Agree payment with the buyer when you
        call.
      </p>
    </Card>
  );
}
