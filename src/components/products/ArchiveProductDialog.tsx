import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

export function ArchiveProductDialog({
  isOpen,
  isArchiving,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  isArchiving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      isOpen={isOpen}
      title="Archive this product?"
      description="It's removed from the storefront and can't be ordered. Existing orders aren't affected."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={isArchiving} onClick={onClose}>
            Keep
          </Button>
          <Button
            variant="danger"
            disabled={isArchiving}
            isLoading={isArchiving}
            onClick={onConfirm}
          >
            Archive
          </Button>
        </>
      }
    />
  );
}
