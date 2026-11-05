import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { useOrdersQuery } from '@/hooks/api/queries/sales/useOrdersQuery';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCountry } from '@/utils/country';
import { formatAmount } from '@/utils/money';
import { formatDateTime, formatMovementTime } from '@/utils/movementTime';
import { isHoldEndingSoon } from '@/utils/salesRules';
import { buildOrderPath, ROUTES } from '@/constants/routes';

const SHOWN_ORDERS = 8;

export function NeedsConfirmingCard() {
  const navigate = useNavigate();
  const ordersQuery = useOrdersQuery({ status: 'pending', perPage: SHOWN_ORDERS });
  const total = ordersQuery.data?.meta.total ?? 0;

  let content;
  if (ordersQuery.isPending) {
    content = (
      <div className="flex justify-center p-6">
        <Spinner label="Loading orders" />
      </div>
    );
  } else if (ordersQuery.isError) {
    content = (
      <div className="p-5">
        <Alert tone="danger">Couldn't load orders. Try again.</Alert>
      </div>
    );
  } else {
    content = (
      <DataTable
        caption="Orders waiting for confirmation"
        rows={ordersQuery.data.data}
        getRowKey={(order) => order.id}
        onRowClick={(order) => navigate(buildOrderPath(order.id))}
        empty="No orders waiting. New ones appear here when buyers check out."
        columns={[
          {
            key: 'buyer',
            header: 'Buyer',
            render: (order) => (
              <div>
                <div className="font-medium">{order.buyer_name}</div>
                <div className="text-xs text-text-tertiary">
                  {order.zone_name ?? formatCountry(order.country)}
                </div>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (order) => (
              <div className="flex flex-col items-start gap-1">
                <StatusBadge kind="order" status={order.status} />
                {order.hold_expires_at && isHoldEndingSoon(order.hold_expires_at) ? (
                  <Badge size="sm" tone="warning">
                    Hold ends {formatDateTime(order.hold_expires_at)}
                  </Badge>
                ) : null}
              </div>
            ),
          },
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
            key: 'grand_total',
            header: 'Total (KES)',
            align: 'right',
            render: (order) => (
              <span className="font-medium">{formatAmount(order.grand_total)}</span>
            ),
          },
        ]}
      />
    );
  }

  return (
    <Card
      flush
      title="Needs confirming"
      subtitle="Their stock is held until you confirm or the hold ends."
      actions={
        <ButtonLink to={`${ROUTES.ORDERS}?status=pending`}>
          All orders
          <Icon icon={ArrowRight} size={14} />
        </ButtonLink>
      }
      footer={
        total > SHOWN_ORDERS ? (
          <span className="mr-auto text-[13px] text-text-secondary">
            Showing {SHOWN_ORDERS} of {total}
          </span>
        ) : undefined
      }
    >
      {content}
    </Card>
  );
}
