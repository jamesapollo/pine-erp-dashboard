import { Link, useNavigate } from 'react-router-dom';

import { type OrderListItem } from '@/types/sales';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatAmount } from '@/utils/money';
import { formatDateTime, formatMovementTime } from '@/utils/movementTime';
import { isHoldEndingSoon } from '@/utils/salesRules';
import { buildOrderPath } from '@/constants/routes';

export function OrdersTable({
  orders,
  hasFilters,
}: {
  orders: OrderListItem[];
  hasFilters: boolean;
}) {
  const navigate = useNavigate();

  return (
    <DataTable
      caption="Orders"
      rows={orders}
      getRowKey={(order) => order.id}
      onRowClick={(order) => navigate(buildOrderPath(order.id))}
      empty={
        hasFilters
          ? 'No orders in this view.'
          : "No orders yet. They'll appear here when buyers check out."
      }
      columns={[
        {
          key: 'created_at',
          header: 'Placed',
          render: (order) => (
            <span className="whitespace-nowrap text-text-secondary">
              {formatMovementTime(order.created_at)}
            </span>
          ),
        },
        {
          key: 'buyer',
          header: 'Buyer',
          render: (order) => (
            <div>
              <Link
                to={buildOrderPath(order.id)}
                // The row navigates on click as well; stop the click reaching it twice.
                onClick={(event) => event.stopPropagation()}
                className="font-medium text-text-primary no-underline hover:underline focus-visible:rounded-chip focus-visible:shadow-focus focus-visible:outline-none"
              >
                {order.buyer_name}
              </Link>
              <div className="text-xs text-text-tertiary">{order.buyer_phone}</div>
            </div>
          ),
        },
        {
          key: 'zone',
          header: 'Zone',
          render: (order) => (
            <span className="inline-flex items-center gap-1.5">
              {order.zone_name ?? <span className="text-text-disabled">—</span>}
              {order.delivery_fee_pending ? (
                <Badge size="sm" tone="warning">
                  Quote
                </Badge>
              ) : null}
            </span>
          ),
        },
        {
          key: 'status',
          header: 'Order',
          render: (order) => (
            <div className="flex flex-col items-start gap-1">
              <StatusBadge kind="order" status={order.status} />
              {order.status === 'pending' &&
              order.hold_expires_at &&
              isHoldEndingSoon(order.hold_expires_at) ? (
                <Badge size="sm" tone="warning">
                  Hold ends {formatDateTime(order.hold_expires_at)}
                </Badge>
              ) : null}
            </div>
          ),
        },
        {
          key: 'delivery_status',
          header: 'Delivery',
          render: (order) =>
            order.delivery_status ? (
              <StatusBadge kind="delivery" status={order.delivery_status} />
            ) : (
              <span className="text-text-disabled">—</span>
            ),
        },
        {
          key: 'grand_total',
          header: 'Total (KES)',
          align: 'right',
          render: (order) => <span className="font-medium">{formatAmount(order.grand_total)}</span>,
        },
      ]}
    />
  );
}
