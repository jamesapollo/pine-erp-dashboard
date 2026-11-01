import { useId } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form';
import { ClipboardCheck, PackageMinus, PackagePlus, type LucideIcon } from 'lucide-react';

import { type VariantStockLevel } from '@/types/catalogue';
import { useCreateStockAdjustmentMutation } from '@/hooks/api/mutations/inventory/useCreateStockAdjustmentMutation';
import {
  buildStockAdjustSchema,
  getOnHandAfter,
  toStockAdjustmentBody,
  type StockAdjustInput,
  type StockAdjustMode,
} from '@/components/inventory/stockAdjustSchema';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { getActionErrorMessage, getFieldError } from '@/utils/apiErrors';
import { cn } from '@/utils/cn';
import { getStockVariantName } from '@/utils/variantLabel';

const MODES: { value: StockAdjustMode; icon: LucideIcon; title: string; description: string }[] = [
  { value: 'receipt', icon: PackagePlus, title: 'Receive', description: 'New stock arrived' },
  { value: 'remove', icon: PackageMinus, title: 'Remove', description: 'Damaged, lost, used' },
  { value: 'count', icon: ClipboardCheck, title: 'Set count', description: 'After a stock take' },
];

const QUANTITY_LABELS: Record<StockAdjustMode, string> = {
  receipt: 'Units received',
  remove: 'Units removed',
  count: 'Counted on hand',
};

const REASON_PLACEHOLDERS: Record<StockAdjustMode, string> = {
  receipt: 'Supplier delivery',
  remove: 'Damaged in store',
  count: 'Monthly stock take',
};

function ModeOption({
  mode,
  isSelected,
  registration,
}: {
  mode: (typeof MODES)[number];
  isSelected: boolean;
  registration: UseFormRegisterReturn<'mode'>;
}) {
  return (
    <label
      className={cn(
        'flex min-w-[150px] flex-1 cursor-pointer items-start gap-2.5 rounded-control border bg-surface-card p-3 has-[:focus-visible]:shadow-focus',
        isSelected ? 'border-2 border-brand-600 bg-brand-50 p-[11px]' : 'border-border-default',
      )}
    >
      <input type="radio" value={mode.value} className="sr-only" {...registration} />
      <Icon
        icon={mode.icon}
        className={cn('mt-0.5 shrink-0', isSelected ? 'text-brand-700' : 'text-text-secondary')}
      />
      <span>
        <span className="block text-sm font-medium text-text-primary">{mode.title}</span>
        <span className="mt-0.5 block text-xs text-text-secondary">{mode.description}</span>
      </span>
    </label>
  );
}

// Render it only while open, so each opening starts afresh in the chosen mode.
export function StockAdjustDialog({
  level,
  initialMode,
  onClose,
}: {
  level: VariantStockLevel;
  initialMode: StockAdjustMode;
  onClose: () => void;
}) {
  const formId = useId();
  const adjustMutation = useCreateStockAdjustmentMutation();
  const onHand = level.stock.on_hand;
  const variantName = getStockVariantName(level);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<StockAdjustInput>({
    resolver: zodResolver(buildStockAdjustSchema(onHand)),
    mode: 'onSubmit',
    defaultValues: { mode: initialMode, quantity: '', reason: '' },
  });
  const [mode, quantity] = useWatch({ control, name: ['mode', 'quantity'] });
  const onHandAfter = getOnHandAfter(onHand, mode, quantity);

  // A rule only the server knows (such as units held for orders) comes back on change or set_to.
  const serverError = adjustMutation.error;
  const serverQuantityError =
    getFieldError(serverError, 'change') ?? getFieldError(serverError, 'set_to');
  const serverReasonError = getFieldError(serverError, 'reason');
  const hasServerFieldError = Boolean(serverQuantityError || serverReasonError);

  const onSubmit = handleSubmit((values) => {
    adjustMutation.mutate(
      { body: toStockAdjustmentBody(level.variant_id, values), variantName },
      { onSuccess: onClose },
    );
  });

  return (
    <Dialog
      isOpen
      title="Adjust stock"
      description={`${variantName} — ${onHand} on hand`}
      width={520}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={adjustMutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} isLoading={adjustMutation.isPending}>
            Save
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} className="grid gap-3.5">
        {adjustMutation.isError && !hasServerFieldError ? (
          <Alert tone="danger">{getActionErrorMessage(adjustMutation.error)}</Alert>
        ) : null}
        <fieldset className="m-0 flex flex-wrap gap-2 border-0 p-0">
          <legend className="sr-only">What happened</legend>
          {MODES.map((option) => (
            <ModeOption
              key={option.value}
              mode={option}
              isSelected={mode === option.value}
              registration={register('mode')}
            />
          ))}
        </fieldset>
        <div className="grid grid-cols-2 items-start gap-3">
          <Input
            label={QUANTITY_LABELS[mode]}
            suffix="units"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            error={errors.quantity?.message ?? serverQuantityError}
            {...register('quantity')}
          />
          <div className="pt-6 text-sm text-text-secondary" aria-live="polite">
            On hand: {onHand} →{' '}
            <b className="font-semibold text-text-primary">{onHandAfter ?? '—'}</b>
          </div>
        </div>
        <Textarea
          label="Reason"
          optional={mode === 'receipt'}
          rows={2}
          placeholder={REASON_PLACEHOLDERS[mode]}
          error={errors.reason?.message ?? serverReasonError}
          {...register('reason')}
        />
      </form>
    </Dialog>
  );
}
