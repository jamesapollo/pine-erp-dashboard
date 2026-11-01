import { type DeliveryZone } from '@/types/sales';
import { useDeleteDeliveryZoneMutation } from '@/hooks/api/mutations/sales/useDeleteDeliveryZoneMutation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { getActionErrorMessage } from '@/utils/apiErrors';

export function DeleteDeliveryZoneDialog({
  zone,
  onClose,
}: {
  zone: DeliveryZone;
  onClose: () => void;
}) {
  const deleteMutation = useDeleteDeliveryZoneMutation();

  return (
    <Dialog
      isOpen
      title={`Delete ${zone.name}?`}
      description="Buyers can’t pick it any more. Past orders keep the zone name and fee they were placed with. To hide it for a while, switch it off instead."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={deleteMutation.isPending} onClick={onClose}>
            Keep
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(zone, { onSuccess: onClose })}
          >
            Delete zone
          </Button>
        </>
      }
    >
      {deleteMutation.isError ? (
        <Alert tone="danger">{getActionErrorMessage(deleteMutation.error)}</Alert>
      ) : null}
    </Dialog>
  );
}
