import { useId, useState, type FormEvent } from 'react';

import { type Category } from '@/types/catalogue';
import { useCreateCategoryMutation } from '@/hooks/api/mutations/catalogue/useCreateCategoryMutation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { flattenCategoryTree, indentCategoryLabel } from '@/utils/categoryTree';

export function AddCategoryDialog({
  isOpen,
  tree,
  onClose,
}: {
  isOpen: boolean;
  tree: Category[];
  onClose: () => void;
}) {
  const formId = useId();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const createMutation = useCreateCategoryMutation();

  function close() {
    setName('');
    setParentId('');
    createMutation.reset();
    onClose();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    createMutation.mutate(
      { name: trimmedName, parent_id: parentId === '' ? null : Number(parentId) },
      { onSuccess: close },
    );
  }

  const parentOptions = flattenCategoryTree(tree).map(({ category, depth }) => ({
    value: String(category.id),
    label: indentCategoryLabel(category.name, depth),
  }));

  return (
    <Dialog
      isOpen={isOpen}
      title="Add category"
      description="Examples: Dresses, Kitenge, Accessories."
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={!name.trim()}
            isLoading={createMutation.isPending}
          >
            Add
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Name"
          autoFocus
          placeholder="Kitenge"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Select
          label="Parent"
          placeholder="None"
          options={parentOptions}
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
        />
        {createMutation.isError ? (
          <Alert tone="danger">{getActionErrorMessage(createMutation.error)}</Alert>
        ) : null}
      </form>
    </Dialog>
  );
}
