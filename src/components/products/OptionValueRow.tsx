import { useRef, useState } from 'react';
import { Archive, ChevronDown, ChevronUp, Pencil, RotateCcw, Trash2 } from 'lucide-react';

import { type OptionValue } from '@/types/catalogue';
import { useDeleteOptionValueMutation } from '@/hooks/api/mutations/catalogue/useDeleteOptionValueMutation';
import { useUpdateOptionValueMutation } from '@/hooks/api/mutations/catalogue/useUpdateOptionValueMutation';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';

export function OptionValueRow({
  optionTypeId,
  optionValue,
  siblingNames,
  isFirst,
  isLast,
  isReordering,
  canManage,
  onMove,
}: {
  optionTypeId: number;
  optionValue: OptionValue;
  siblingNames: string[];
  isFirst: boolean;
  isLast: boolean;
  isReordering: boolean;
  canManage: boolean;
  onMove: (direction: 'up' | 'down') => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draft, setDraft] = useState(optionValue.value);
  const isFinished = useRef(false);
  const updateMutation = useUpdateOptionValueMutation();
  const deleteMutation = useDeleteOptionValueMutation();

  const isRetired = !optionValue.is_active;
  const isUsed = optionValue.variants_count > 0;
  const trimmedDraft = draft.trim();
  const isDuplicate = siblingNames.includes(trimmedDraft.toLowerCase());

  function startRenaming() {
    isFinished.current = false;
    setDraft(optionValue.value);
    setIsRenaming(true);
  }

  function finishRenaming(shouldSave: boolean) {
    if (isFinished.current) return;
    isFinished.current = true;
    setIsRenaming(false);
    if (!shouldSave || !trimmedDraft || isDuplicate || trimmedDraft === optionValue.value) return;
    updateMutation.mutate({
      optionTypeId,
      optionValueId: optionValue.id,
      value: trimmedDraft,
      successToast: { title: 'Value saved', description: trimmedDraft },
    });
  }

  function toggleRetired() {
    updateMutation.mutate({
      optionTypeId,
      optionValueId: optionValue.id,
      is_active: isRetired,
      successToast: isRetired
        ? { title: 'Value restored', description: optionValue.value }
        : {
            title: 'Value retired',
            description: `${optionValue.value} · existing variants keep selling`,
          },
    });
  }

  return (
    <li className="flex h-[var(--row-height)] items-center gap-2.5 border-b border-border-subtle px-5">
      <div className="flex flex-col">
        <IconButton
          icon={ChevronUp}
          label="Move up"
          size="sm"
          className="!size-4"
          disabled={!canManage || isFirst || isReordering}
          onClick={() => onMove('up')}
        />
        <IconButton
          icon={ChevronDown}
          label="Move down"
          size="sm"
          className="!size-4"
          disabled={!canManage || isLast || isReordering}
          onClick={() => onMove('down')}
        />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {isRenaming ? (
          <div className="w-[220px]">
            <Input
              size="sm"
              autoFocus
              hideLabel
              label={`Rename ${optionValue.value}`}
              value={draft}
              error={isDuplicate ? 'Already exists' : undefined}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => finishRenaming(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (!isDuplicate) finishRenaming(true);
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  finishRenaming(false);
                }
              }}
            />
          </div>
        ) : (
          <>
            <span
              className={cn(
                'text-sm font-medium',
                isRetired ? 'text-text-tertiary line-through' : 'text-text-primary',
              )}
            >
              {optionValue.value}
            </span>
            {isRetired ? (
              <Badge size="sm" tone="neutral">
                Retired
              </Badge>
            ) : null}
          </>
        )}
      </div>
      <span className="whitespace-nowrap text-[13px] tabular-nums text-text-tertiary">
        {isUsed
          ? `${optionValue.variants_count} ${optionValue.variants_count === 1 ? 'variant' : 'variants'}`
          : 'Unused'}
      </span>
      {canManage ? (
        <div className="flex gap-0.5">
          <IconButton icon={Pencil} label="Rename" size="sm" onClick={startRenaming} />
          {isUsed ? (
            <IconButton
              icon={isRetired ? RotateCcw : Archive}
              label={isRetired ? 'Restore' : 'Retire — hide from new products'}
              size="sm"
              disabled={updateMutation.isPending}
              onClick={toggleRetired}
            />
          ) : (
            <IconButton
              icon={Trash2}
              label="Delete"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteMutation.mutate({
                  optionTypeId,
                  optionValueId: optionValue.id,
                  name: optionValue.value,
                })
              }
            />
          )}
        </div>
      ) : null}
    </li>
  );
}
