import { CircleCheck } from 'lucide-react';

import { type Delivery } from '@/types/sales';
import { useCompleteOrderMutation } from '@/hooks/api/mutations/sales/useCompleteOrderMutation';
import { useOrderQuery } from '@/hooks/api/queries/sales/useOrderQuery';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';

/**
 * A delivered parcel doesn't close the sale by itself: while the order is still dispatched,
 * offer to complete it. Render it only for a delivered delivery and a user who manages orders.
 */
export function CompleteOrderCard({ delivery }: { delivery: Delivery }) {
  const orderQuery = useOrderQuery(delivery.order_id);
  const completeMutation = useCompleteOrderMutation(delivery.order_id);

  if (orderQuery.data?.status !== 'dispatched') return null;

  return (
    <Card className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-text-secondary">
          Delivered. Complete the order to close the sale.
        </div>
        <Button
          size="sm"
          isLoading={completeMutation.isPending}
          onClick={() => completeMutation.mutate()}
        >
          <Icon icon={CircleCheck} size={14} />
          Complete order
        </Button>
      </div>
    </Card>
  );
}
