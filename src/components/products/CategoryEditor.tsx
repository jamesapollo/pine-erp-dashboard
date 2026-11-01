import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

import { type Category } from '@/types/catalogue';
import { useDeleteCategoryMutation } from '@/hooks/api/mutations/catalogue/useDeleteCategoryMutation';
import { useUpdateCategoryMutation } from '@/hooks/api/mutations/catalogue/useUpdateCategoryMutation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { flattenCategoryTree, getDescendantIds, indentCategoryLabel } from '@/utils/categoryTree';

export function CategoryEditor({
  category,
  tree,
  canManage,
}: {
  category: Category;
  tree: Category[];
  canManage: boolean;
}) {
  const [name, setName] = useState(category.name);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const submittedName = useRef(category.name);
  const updateMutation = useUpdateCategoryMutation();
  const deleteMutation = useDeleteCategoryMutation();

  const excludedIds = new Set([category.id, ...getDescendantIds(tree, category.id)]);
  const parentOptions = flattenCategoryTree(tree)
    .filter(({ category: candidate }) => !excludedIds.has(candidate.id))
    .map(({ category: candidate, depth }) => ({
      value: String(candidate.id),
      label: indentCategoryLabel(candidate.name, depth),
    }));

  function commitName() {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === submittedName.current) return;
    submittedName.current = trimmedName;
    updateMutation.mutate(
      { categoryId: category.id, name: trimmedName },
      {
        onError: () => {
          submittedName.current = category.name;
        },
      },
    );
  }

  function closeDeleteDialog() {
    setIsConfirmingDelete(false);
    deleteMutation.reset();
  }

  return (
    <>
      <Card
        title={category.name}
        subtitle={category.parent_id === null ? 'Top-level category' : 'Subcategory'}
        actions={
          canManage ? (
            <Button size="sm" variant="ghost" onClick={() => setIsConfirmingDelete(true)}>
              <Icon icon={Trash2} size={14} />
              Delete category
            </Button>
          ) : null
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Name"
            value={name}
            disabled={!canManage}
            onChange={(event) => setName(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              commitName();
            }}
          />
          <Select
            label="Parent"
            placeholder="None"
            options={parentOptions}
            value={category.parent_id === null ? '' : String(category.parent_id)}
            disabled={!canManage}
            onChange={(event) =>
              updateMutation.mutate({
                categoryId: category.id,
                parent_id: event.target.value === '' ? null : Number(event.target.value),
              })
            }
          />
          <Switch
            label="Visible on storefront"
            checked={category.is_visible}
            disabled={!canManage}
            onChange={(event) =>
              updateMutation.mutate({ categoryId: category.id, is_visible: event.target.checked })
            }
          />
          {updateMutation.isError ? (
            <Alert tone="danger">{getActionErrorMessage(updateMutation.error)}</Alert>
          ) : null}
        </div>
      </Card>
      <Dialog
        isOpen={isConfirmingDelete}
        title={`Delete ${category.name}?`}
        description="Products in this category stay, but lose the link to it."
        onClose={closeDeleteDialog}
        footer={
          <>
            <Button variant="secondary" onClick={closeDeleteDialog}>
              Keep
            </Button>
            <Button
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={() =>
                deleteMutation.mutate(
                  { categoryId: category.id, name: category.name },
                  { onSuccess: closeDeleteDialog },
                )
              }
            >
              Delete
            </Button>
          </>
        }
      >
        {deleteMutation.isError ? (
          <Alert tone="danger">{getActionErrorMessage(deleteMutation.error)}</Alert>
        ) : null}
      </Dialog>
    </>
  );
}
