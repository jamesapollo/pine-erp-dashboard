import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CircleAlert } from 'lucide-react';

import { type Delivery } from '@/types/sales';
import { useDeliveryQuery } from '@/hooks/api/queries/sales/useDeliveryQuery';
import { DeliveryOrderCard } from '@/components/sales/DeliveryOrderCard';
import { DeliveryStatusCard } from '@/components/sales/DeliveryStatusCard';
import { DeliveryTimelineCard } from '@/components/sales/DeliveryTimelineCard';
import { DeliveryTrackingCard } from '@/components/sales/DeliveryTrackingCard';
import { Alert } from '@/components/ui/Alert';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CopyButton } from '@/components/ui/CopyButton';
import { Icon } from '@/components/ui/Icon';
import { NoAccess } from '@/components/ui/NoAccess';
import { OrderRef } from '@/components/ui/OrderRef';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { isStatus } from '@/utils/apiErrors';
import { formatMovementTime } from '@/utils/movementTime';
import { buildOrderPath, ROUTES } from '@/constants/routes';

const FAILED_ADVICE =
  'Retry with the same or a different courier, or mark it returned once the parcel is back.';

// The reason is staff text; end it with a full stop unless it already has one.
function describeFailure(reason: string | null): string {
  const trimmed = reason?.trim();
  if (!trimmed) return FAILED_ADVICE;
  return `${trimmed}${/[.!?]$/.test(trimmed) ? '' : '.'} ${FAILED_ADVICE}`;
}

function FailedBanner({ delivery }: { delivery: Delivery }) {
  return (
    <Card className="mb-4 border-danger-100">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-danger-600">
          <Icon icon={CircleAlert} size={18} />
        </span>
        <div>
          <div className="text-sm font-semibold">Delivery failed</div>
          <div className="mt-0.5 text-sm text-text-secondary">
            {describeFailure(delivery.failure_reason)}
          </div>
        </div>
      </div>
    </Card>
  );
}

function PreparingBanner({ delivery }: { delivery: Delivery }) {
  return (
    <Card className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-text-secondary">
          Being packed. Dispatch it from the order page to choose a courier and start tracking.
        </div>
        <Link
          to={buildOrderPath(delivery.order_id)}
          className="inline-flex h-7 shrink-0 items-center gap-[5px] rounded-control bg-action-primary px-2.5 text-[13px] font-medium leading-none text-white no-underline shadow-sm transition duration-[120ms] ease-out hover:bg-action-primary-hover focus-visible:shadow-focus focus-visible:outline-none"
        >
          Go to order
          <Icon icon={ArrowRight} size={14} />
        </Link>
      </div>
    </Card>
  );
}

function DeliveryDetailContent({ delivery }: { delivery: Delivery }) {
  const isPickup = delivery.method === 'pickup';

  return (
    <>
      {/* Header actions (mark in transit, delivered, failed, returned, retry) go in `actions`. */}
      <PageHeader
        back={<BackLink to={ROUTES.DELIVERIES}>Deliveries</BackLink>}
        title={
          <span className="inline-flex items-center gap-3">
            Delivery <OrderRef value={delivery.order_reference} size="lg" />
          </span>
        }
        titleAside={<CopyButton value={delivery.order_reference} label="Copy reference" />}
        sub={`${isPickup ? 'Pickup' : 'Courier'} · last update ${formatMovementTime(delivery.updated_at)}`}
      />
      {/* The complete-order card for a delivered parcel goes here, above the banners and grid. */}
      {delivery.status === 'failed' ? <FailedBanner delivery={delivery} /> : null}
      {delivery.status === 'preparing' ? <PreparingBanner delivery={delivery} /> : null}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <DeliveryTimelineCard delivery={delivery} />
        <div className="flex min-w-0 flex-col gap-4">
          <DeliveryStatusCard delivery={delivery} />
          {isPickup ? null : <DeliveryTrackingCard delivery={delivery} />}
          <DeliveryOrderCard delivery={delivery} />
        </div>
      </div>
    </>
  );
}

export function DeliveryDetailPage() {
  const { deliveryId = '' } = useParams();
  const deliveryQuery = useDeliveryQuery(Number(deliveryId));

  if (deliveryQuery.isError) {
    if (isStatus(deliveryQuery.error, 404)) return <NotFoundPage />;
    if (isStatus(deliveryQuery.error, 403)) {
      return (
        <>
          <PageHeader title="Delivery" />
          <NoAccess message="You don't have access to orders." />
        </>
      );
    }
    return (
      <>
        <PageHeader title="Delivery" />
        <div className="flex flex-col items-start gap-3">
          <Alert tone="danger">Couldn&apos;t load this delivery. Try again.</Alert>
          <Button variant="secondary" onClick={() => deliveryQuery.refetch()}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  if (deliveryQuery.isPending) {
    return (
      <div className="flex justify-center p-10 text-text-tertiary">
        <Spinner label="Loading delivery" />
      </div>
    );
  }

  return <DeliveryDetailContent delivery={deliveryQuery.data} />;
}
