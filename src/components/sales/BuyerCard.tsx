import { Phone } from 'lucide-react';

import { type Order } from '@/types/sales';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { formatCountry } from '@/utils/country';

export function BuyerCard({ order }: { order: Order }) {
  const { address } = order;
  const locality = [address.city, address.region, address.postal_code]
    .filter((part): part is string => Boolean(part))
    .join(', ');

  return (
    <Card
      title="Buyer"
      actions={
        <a
          href={`tel:${order.buyer_phone}`}
          aria-label="Call buyer"
          title="Call buyer"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-control border border-border-default bg-surface-card text-text-secondary shadow-xs transition duration-[120ms] ease-out hover:border-border-strong hover:text-text-primary focus-visible:shadow-focus focus-visible:outline-none"
        >
          <Icon icon={Phone} size={14} />
        </a>
      }
    >
      <div className="mb-3 flex items-center gap-3">
        <Avatar name={order.buyer_name} size={40} />
        <div className="min-w-0">
          <div className="font-semibold">{order.buyer_name}</div>
          <div className="text-[13px] text-text-secondary">{order.buyer_phone}</div>
          {order.buyer_email ? (
            <div className="truncate text-[13px] text-text-secondary">{order.buyer_email}</div>
          ) : null}
        </div>
      </div>
      <address className="text-sm not-italic leading-normal text-text-secondary">
        <div>{address.line1}</div>
        {address.line2 ? <div>{address.line2}</div> : null}
        {locality ? <div>{locality}</div> : null}
        <div>{formatCountry(order.country)}</div>
      </address>
    </Card>
  );
}
