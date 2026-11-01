import { useRef, useState, type FormEvent } from 'react';
import { Info, Plus, Trash2 } from 'lucide-react';

import { type OptionType } from '@/types/catalogue';
import { useCreateOptionValueMutation } from '@/hooks/api/mutations/catalogue/useCreateOptionValueMutation';
import { useDeleteOptionTypeMutation } from '@/hooks/api/mutations/catalogue/useDeleteOptionTypeMutation';
import { useUpdateOptionTypeMutation } from '@/hooks/api/mutations/catalogue/useUpdateOptionTypeMutation';
import { useUpdateOptionValueMutation } from '@/hooks/api/mutations/catalogue/useUpdateOptionValueMutation';
import { OptionValueRow } from '@/components/products/OptionValueRow';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { getSortOrderChanges, moveItem } from '@/utils/reorder';

export function OptionTypeEditor({
  optionType,
  canManage,
}: {
  optionType: OptionType;
  canManage: boolean;
}) {
  const [name, setName] = useState(optionType.name);
  const [newValue, setNewValue] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const submittedName = useRef(optionType.name);
  const updateTypeMutation = useUpdateOptionTypeMutation();
  const deleteTypeMutation = useDeleteOptionTypeMutation();
  const createValueMutation = useCreateOptionValueMutation();
  const reorderMutation = useUpdateOptionValueMutation();

  const { values, products_count: productsCount } = optionType;
  const trimmedNewValue = newValue.trim();
  const isDuplicateValue = values.some(
    (existing) => existing.value.trim().toLowerCase() === trimmedNewValue.toLowerCase(),
  );

  function commitName() {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === submittedName.current) return;
    submittedName.current = trimmedName;
    updateTypeMutation.mutate(
      { optionTypeId: optionType.id, name: trimmedName },
      {
        onError: () => {
          submittedName.current = optionType.name;
        },
      },
    );
  }

  function handleAddValue(event: FormEvent) {
    event.preventDefault();
    if (!trimmedNewValue || isDuplicateValue) return;
    const nextSortOrder = Math.max(-1, ...values.map((existing) => existing.sort_order)) + 1;
    createValueMutation.mutate(
      { optionTypeId: optionType.id, value: trimmedNewValue, sort_order: nextSortOrder },
      { onSuccess: () => setNewValue('') },
    );
  }

  function moveValue(index: number, direction: 'up' | 'down') {
    const reordered = moveItem(values, index, direction === 'up' ? index - 1 : index + 1);
    for (const change of getSortOrderChanges(reordered)) {
      reorderMutation.mutate({
        optionTypeId: optionType.id,
        optionValueId: change.id,
        sort_order: change.sort_order,
      });
    }
  }

  return (
    <>
      <Card
        flush
        title={optionType.name}
        subtitle={
          productsCount > 0
            ? `Used by ${productsCount} ${productsCount === 1 ? 'product' : 'products'}`
            : 'Not used by any product yet'
        }
        actions={
          canManage ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={productsCount > 0}
              onClick={() => setIsConfirmingDelete(true)}
            >
              <Icon icon={Trash2} size={14} />
              Delete type
            </Button>
          ) : null
        }
      >
        <div className="border-b border-border-subtle px-5 py-4">
          <Input
            label="Name"
            value={name}
            disabled={!canManage}
            hint="Shown to buyers on the product page, e.g. “Choose a Size”."
            onChange={(event) => setName(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              commitName();
            }}
          />
        </div>
        <div className="flex items-baseline justify-between px-5 pb-1.5 pt-3.5">
          <span className="text-[13px] font-medium leading-[1.2]">Values</span>
          <span className="text-xs text-text-tertiary">Order here is the order buyers see</span>
        </div>
        <ul aria-label="Values" className="m-0 list-none p-0">
          {values.map((optionValue, index) => (
            <OptionValueRow
              key={optionValue.id}
              optionTypeId={optionType.id}
              optionValue={optionValue}
              siblingNames={values
                .filter((sibling) => sibling.id !== optionValue.id)
                .map((sibling) => sibling.value.trim().toLowerCase())}
              isFirst={index === 0}
              isLast={index === values.length - 1}
              isReordering={reorderMutation.isPending}
              canManage={canManage}
              onMove={(direction) => moveValue(index, direction)}
            />
          ))}
        </ul>
        {canManage ? (
          <form onSubmit={handleAddValue} className="flex items-start gap-2 px-5 pb-4 pt-3">
            <div className="w-[260px]">
              <Input
                size="sm"
                icon={Plus}
                hideLabel
                label={`New ${optionType.name.toLowerCase()} value`}
                placeholder={`New ${optionType.name.toLowerCase()} value`}
                value={newValue}
                error={trimmedNewValue && isDuplicateValue ? 'Already exists' : undefined}
                onChange={(event) => setNewValue(event.target.value)}
              />
            </div>
            <Button
              size="sm"
              type="submit"
              disabled={!trimmedNewValue || isDuplicateValue}
              isLoading={createValueMutation.isPending}
            >
              Add value
            </Button>
          </form>
        ) : null}
        <div className="flex items-start gap-2 rounded-b-card border-t border-border-subtle bg-surface-sunken px-5 py-3 text-[13px] text-text-secondary">
          <Icon icon={Info} size={15} className="mt-0.5 shrink-0 text-text-tertiary" />
          Values in use can’t be deleted — retire them instead. Retired values are hidden when
          creating products, but existing variants keep selling.
        </div>
      </Card>
      <Dialog
        isOpen={isConfirmingDelete}
        title={`Delete ${optionType.name}?`}
        description="No products use it, so nothing on the storefront changes."
        onClose={() => setIsConfirmingDelete(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsConfirmingDelete(false)}>
              Keep
            </Button>
            <Button
              variant="danger"
              isLoading={deleteTypeMutation.isPending}
              onClick={() =>
                deleteTypeMutation.mutate(
                  { optionTypeId: optionType.id, name: optionType.name },
                  { onSettled: () => setIsConfirmingDelete(false) },
                )
              }
            >
              Delete
            </Button>
          </>
        }
      />
    </>
  );
}
