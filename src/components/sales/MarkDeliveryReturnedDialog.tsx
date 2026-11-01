import { type Delivery } from '@/types/sales';
import { useMarkDeliveryReturnedMutation } from '@/hooks/api/mutations/sales/useMarkDeliveryReturnedMutation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { getActionErrorMessage } from '@/utils/apiErrors';

export function MarkDeliveryReturnedDialog({
  delivery,
  onClose,
}: {
  delivery: Delivery;
  onClose: () => void;
}) {
  const returnedMutation = useMarkDeliveryReturnedMutation(delivery.id);

  return (
    <Dialog
      isOpen
      title="Mark returned?"
      description="Use this once the parcel is back at the store. This is final."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={returnedMutation.isPending} onClick={onClose}>
            Back
          </Button>
          <Button
            isLoading={returnedMutation.isPending}
            onClick={() => returnedMutation.mutate(undefined, { onSuccess: onClose })}
          >
            Mark returned
          </Button>
        </>
      }
    >
      {returnedMutation.isError ? (
        <Alert tone="danger">{getActionErrorMessage(returnedMutation.error)}</Alert>
      ) : null}
    </Dialog>
  );
}
