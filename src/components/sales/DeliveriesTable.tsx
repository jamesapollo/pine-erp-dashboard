import { Link, useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';

import { type DeliveryListItem } from '@/types/sales';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Icon } from '@/components/ui/Icon';
import { OrderRef } from '@/components/ui/OrderRef';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime } from '@/utils/movementTime';
import { buildDeliveryPath } from '@/constants/routes';

function Dash() {
  return <span className="text-text-disabled">—</span>;
}

function DeliveryMethod({ method }: { method: DeliveryListItem['method'] }) {
  if (method === 'pickup') {
    return (
      <Badge size="sm" tone="clay">
        Pickup
      </Badge>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-text-secondary">
      <Icon icon={Truck} size={14} />
      Courier
    </span>
  );
}

export function DeliveriesTable({
  deliveries,
  isSearching,
}: {
  deliveries: DeliveryListItem[];
  isSearching: boolean;
}) {
  const navigate = useNavigate();

  return (
    <DataTable
      caption="Deliveries"
      rows={deliveries}
      getRowKey={(delivery) => delivery.id}
      onRowClick={(delivery) => navigate(buildDeliveryPath(delivery.id))}
      empty={
        isSearching
          ? 'No delivery matches that reference or tracking number.'
          : 'No deliveries in this view.'
      }
      columns={[
        {
          key: 'order',
          header: 'Order',
          render: (delivery) => (
            <Link
              to={buildDeliveryPath(delivery.id)}
              // The row navigates on click as well; stop the click reaching it twice.
              onClick={(event) => event.stopPropagation()}
              className="no-underline focus-visible:rounded-chip focus-visible:shadow-focus focus-visible:outline-none"
            >
              <OrderRef value={delivery.order_reference} />
            </Link>
          ),
        },
        {
          key: 'method',
          header: 'Method',
          render: (delivery) => <DeliveryMethod method={delivery.method} />,
        },
        {
          key: 'courier',
          header: 'Courier',
          render: (delivery) => delivery.courier_name ?? <Dash />,
        },
        {
          key: 'tracking',
          header: 'Tracking',
          render: (delivery) =>
            delivery.tracking_number ? (
              <OrderRef value={delivery.tracking_number} plain />
            ) : (
              <Dash />
            ),
        },
        {
          key: 'status',
          header: 'Status',
          render: (delivery) => (
            <StatusBadge kind="delivery" status={delivery.status} label={delivery.status_label} />
          ),
        },
        {
          key: 'dispatched_at',
          header: 'Dispatched',
          render: (delivery) =>
            delivery.dispatched_at ? (
              <span className="whitespace-nowrap text-text-secondary">
                {formatDateTime(delivery.dispatched_at)}
              </span>
            ) : (
              <Dash />
            ),
        },
        {
          key: 'updated_at',
          header: 'Last update',
          render: (delivery) => (
            <span className="whitespace-nowrap text-text-secondary">
              {formatDateTime(delivery.updated_at)}
            </span>
          ),
        },
      ]}
    />
  );
}
