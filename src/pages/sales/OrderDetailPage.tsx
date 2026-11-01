import { useParams } from 'react-router-dom';

import { type Order } from '@/types/sales';
import { useOrderQuery } from '@/hooks/api/queries/sales/useOrderQuery';
import { BuyerCard } from '@/components/sales/BuyerCard';
import { OrderActivityCard } from '@/components/sales/OrderActivityCard';
import { OrderDeliveryCard } from '@/components/sales/OrderDeliveryCard';
import { OrderItemsCard } from '@/components/sales/OrderItemsCard';
import { OrderStatusCard } from '@/components/sales/OrderStatusCard';
import { PaymentCard } from '@/components/sales/PaymentCard';
import { Alert } from '@/components/ui/Alert';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { NoAccess } from '@/components/ui/NoAccess';
import { OrderRef } from '@/components/ui/OrderRef';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { isStatus } from '@/utils/apiErrors';
import { formatMovementTime } from '@/utils/movementTime';
import { ROUTES } from '@/constants/routes';

function OrderDetailContent({ order }: { order: Order }) {
  return (
    <>
      <PageHeader
        back={<BackLink to={ROUTES.ORDERS}>Orders</BackLink>}
        title={
          <span className="inline-flex items-center gap-3">
            Order <OrderRef value={order.reference} size="lg" />
          </span>
        }
        titleAside={<CopyButton value={order.reference} label="Copy reference" />}
        sub={`Placed ${formatMovementTime(order.created_at)} · ${order.buyer_name}`}
      />
      <OrderStatusCard order={order} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <OrderItemsCard order={order} />
          <OrderActivityCard order={order} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <BuyerCard order={order} />
          <OrderDeliveryCard order={order} />
          <PaymentCard order={order} />
        </div>
      </div>
    </>
  );
}

export function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const orderQuery = useOrderQuery(Number(orderId));

  if (orderQuery.isError) {
    if (isStatus(orderQuery.error, 404)) return <NotFoundPage />;
    if (isStatus(orderQuery.error, 403)) {
      return (
        <>
          <PageHeader title="Order" />
          <NoAccess message="You don't have access to orders." />
        </>
      );
    }
    return (
      <>
        <PageHeader title="Order" />
        <div className="flex flex-col items-start gap-3">
          <Alert tone="danger">Couldn&apos;t load this order. Try again.</Alert>
          <Button variant="secondary" onClick={() => orderQuery.refetch()}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  if (orderQuery.isPending) {
    return (
      <div className="flex justify-center p-10 text-text-tertiary">
        <Spinner label="Loading order" />
      </div>
    );
  }

  return <OrderDetailContent order={orderQuery.data} />;
}
