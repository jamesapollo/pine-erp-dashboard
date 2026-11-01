import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { type Delivery } from '@/types/sales';
import { useOrderQuery } from '@/hooks/api/queries/sales/useOrderQuery';
import { DetailRow } from '@/components/sales/DetailRow';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { OrderRef } from '@/components/ui/OrderRef';
import { buildOrderPath } from '@/constants/routes';

function Dash() {
  return <span className="text-text-disabled">—</span>;
}

// The delivery only carries the order's id and reference; buyer and zone come from the order.
export function DeliveryOrderCard({ delivery }: { delivery: Delivery }) {
  const orderQuery = useOrderQuery(delivery.order_id);
  const order = orderQuery.data;

  return (
    <Card
      title="Order"
      actions={
        <Link
          to={buildOrderPath(delivery.order_id)}
          className="inline-flex h-7 items-center gap-[5px] rounded-control px-2.5 text-[13px] font-medium leading-none text-text-secondary no-underline transition duration-[120ms] ease-out hover:bg-neutral-100 hover:text-text-primary focus-visible:shadow-focus focus-visible:outline-none"
        >
          Open
          <Icon icon={ArrowRight} size={14} />
        </Link>
      }
    >
      <dl className="m-0">
        <DetailRow label="Reference">
          <OrderRef value={delivery.order_reference} plain />
        </DetailRow>
        <DetailRow label="Buyer">{order?.buyer_name ?? <Dash />}</DetailRow>
        <DetailRow label="Zone">{order?.delivery_charge.zone_name ?? <Dash />}</DetailRow>
      </dl>
    </Card>
  );
}
