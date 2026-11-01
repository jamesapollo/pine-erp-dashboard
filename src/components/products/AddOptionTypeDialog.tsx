import { useId, useState, type FormEvent } from 'react';

import { type OptionType } from '@/types/catalogue';
import { useCreateOptionTypeMutation } from '@/hooks/api/mutations/catalogue/useCreateOptionTypeMutation';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';

export function AddOptionTypeDialog({
  isOpen,
  optionTypes,
  onAdded,
  onClose,
}: {
  isOpen: boolean;
  optionTypes: OptionType[];
  onAdded: (optionType: OptionType) => void;
  onClose: () => void;
}) {
  const formId = useId();
  const [name, setName] = useState('');
  const createMutation = useCreateOptionTypeMutation();

  const trimmedName = name.trim();
  const isDuplicate = optionTypes.some(
    (existing) => existing.name.trim().toLowerCase() === trimmedName.toLowerCase(),
  );

  function close() {
    setName('');
    onClose();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!trimmedName || isDuplicate) return;
    createMutation.mutate(
      { name: trimmedName },
      {
        onSuccess: (optionType) => {
          close();
          onAdded(optionType);
        },
      },
    );
  }

  return (
    <Dialog
      isOpen={isOpen}
      title="Add option type"
      description="Examples: Size, Colour, Material, Length."
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={!trimmedName || isDuplicate}
            isLoading={createMutation.isPending}
          >
            Add
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit}>
        <Input
          label="Name"
          autoFocus
          placeholder="Material"
          value={name}
          error={trimmedName && isDuplicate ? 'Already exists' : undefined}
          onChange={(event) => setName(event.target.value)}
        />
      </form>
    </Dialog>
  );
}
