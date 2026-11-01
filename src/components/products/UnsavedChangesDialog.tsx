import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

export function UnsavedChangesDialog({
  isOpen,
  onKeepEditing,
  onDiscard,
}: {
  isOpen: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}) {
  return (
    <Dialog
      isOpen={isOpen}
      title="Discard changes?"
      description="Your edits haven't been saved."
      onClose={onKeepEditing}
      footer={
        <>
          <Button variant="secondary" onClick={onKeepEditing}>
            Keep editing
          </Button>
          <Button variant="danger" onClick={onDiscard}>
            Discard
          </Button>
        </>
      }
    />
  );
}
