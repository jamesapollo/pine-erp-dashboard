import { useId, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { type Product, type ProductVariant } from '@/types/catalogue';
import { createVariant } from '@/hooks/api/mutations/catalogue/useCreateVariantMutation';
import { createStockAdjustment } from '@/hooks/api/mutations/inventory/useCreateStockAdjustmentMutation';
import { useOptionTypesQuery } from '@/hooks/api/queries/catalogue/useOptionTypesQuery';
import { queryKeys } from '@/hooks/api/queryKeys';
import { OPENING_STOCK_REASON } from '@/hooks/useCreateProductFlow';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useToastContext } from '@/components/ui/ToastContext';
import { isValidOpeningStock } from '@/components/products/productNewSchema';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { cn } from '@/utils/cn';
import { isValidPrice, toMoneyInput } from '@/utils/money';
import { buildVariantCombinations } from '@/utils/variantCombinations';
import { getVariantLabel } from '@/utils/variantLabel';

const PRICE_FORMAT_MESSAGE = 'Enter a price like 4500 or 4500.50';
const STOCK_FORMAT_MESSAGE = 'Enter a whole number of units';

type FieldErrors = { price?: string; stock?: string };

/**
 * Adds one variant to a product that has option types: one value per option type, an optional
 * price override and optional opening stock (recorded as a receipt). If the variant saves but its
 * opening stock doesn't, the variant is kept and `onStockFailed` gets the message to show.
 */
export function AddVariantDialog({
  product,
  canSetPrices,
  canRecordStock,
  onVariantSaved,
  onStockFailed,
  onClose,
}: {
  product: Product;
  canSetPrices: boolean;
  canRecordStock: boolean;
  onVariantSaved: (variant: ProductVariant) => Promise<void>;
  onStockFailed: (message: string) => void;
  onClose: () => void;
}) {
  const formId = useId();
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  const optionTypesQuery = useOptionTypesQuery();
  const [chosenValueIds, setChosenValueIds] = useState<Record<number, number>>();
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string>();
  const [isAdding, setIsAdding] = useState(false);

  // The product's option types in its order, with only the values new variants may use.
  const productOptionTypes = product.option_type_ids.flatMap((optionTypeId) => {
    const optionType = optionTypesQuery.data?.find((candidate) => candidate.id === optionTypeId);
    if (!optionType) return [];
    return [{ ...optionType, values: optionType.values.filter((value) => value.is_active) }];
  });
  const optionTypeNames = productOptionTypes.map((optionType) => optionType.name);

  function combinationKey(valueIds: number[]): string {
    return valueIds.join('-');
  }

  const existingKeys = new Set(
    product.variants.map((variant) =>
      combinationKey(
        product.option_type_ids.flatMap((optionTypeId) =>
          variant.option_values
            .filter((optionValue) => optionValue.option_type_id === optionTypeId)
            .map((optionValue) => optionValue.option_value_id),
        ),
      ),
    ),
  );
  const combinations = buildVariantCombinations(
    productOptionTypes.map((optionType) => ({
      optionType,
      valueIds: optionType.values.map((value) => value.id),
    })),
  );
  const freeCombinations = combinations.filter((combination) => !existingKeys.has(combination.key));

  // Start on the first combination that doesn't exist yet.
  const firstFree = freeCombinations[0]?.optionValueIds ?? [];
  const selectedValueIds =
    chosenValueIds ??
    Object.fromEntries(
      productOptionTypes.map((optionType, index) => [optionType.id, firstFree[index]]),
    );
  const selectedValues = productOptionTypes.map((optionType) =>
    optionType.values.find((value) => value.id === selectedValueIds[optionType.id]),
  );
  const isComplete = selectedValues.every((value) => value !== undefined);
  const selectedIds = selectedValues.flatMap((value) => (value ? [value.id] : []));
  const selectedLabel = selectedValues.map((value) => value?.value).join(' · ');
  const isDuplicate = isComplete && existingKeys.has(combinationKey(selectedIds));
  const isEverythingTaken = optionTypesQuery.isSuccess && freeCombinations.length === 0;

  function chooseValue(optionTypeId: number, valueId: number) {
    setChosenValueIds({ ...selectedValueIds, [optionTypeId]: valueId });
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (canSetPrices && price.trim() !== '' && !isValidPrice(price)) {
      errors.price = PRICE_FORMAT_MESSAGE;
    }
    if (canRecordStock && stock.trim() !== '' && !isValidOpeningStock(stock)) {
      errors.stock = STOCK_FORMAT_MESSAGE;
    }
    return errors;
  }

  async function add() {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaveError(undefined);
    setIsAdding(true);
    let variant: ProductVariant;
    try {
      variant = await createVariant(store.id, product.id, {
        option_value_ids: selectedIds,
        ...(canSetPrices && price.trim() !== '' ? { price: toMoneyInput(price) } : {}),
      });
    } catch (error) {
      setSaveError(getActionErrorMessage(error));
      setIsAdding(false);
      return;
    }
    await onVariantSaved(variant);
    // The option values it uses now count one more variant.
    void queryClient.invalidateQueries({ queryKey: queryKeys.optionTypes(store.id) });

    const openingStock = canRecordStock && stock.trim() !== '' ? Number(stock.trim()) : 0;
    let stockError: unknown;
    if (openingStock > 0) {
      try {
        const result = await createStockAdjustment(store.id, {
          variant_id: variant.id,
          type: 'receipt',
          change: openingStock,
          reason: OPENING_STOCK_REASON,
        });
        await onVariantSaved({ ...variant, stock: result.stock });
      } catch (error) {
        stockError = error;
      }
    }
    await queryClient.invalidateQueries({
      queryKey: queryKeys.stockMovements(store.id, product.id),
    });

    setIsAdding(false);
    onClose();
    if (stockError === undefined) {
      showToast({ title: 'Variant added', description: getVariantLabel(variant) });
    } else {
      onStockFailed(
        `Variant added, but its opening stock didn't save: ${getActionErrorMessage(stockError)}`,
      );
    }
  }

  function handleSubmit(event: FormEvent) {
    // The dialog renders inside the product form's tree; keep its submit from saving the product.
    event.preventDefault();
    event.stopPropagation();
    if (isAdding || !isComplete || isDuplicate || isEverythingTaken) return;
    void add();
  }

  function renderBody() {
    if (optionTypesQuery.isPending) {
      return (
        <div className="flex justify-center py-6 text-text-tertiary">
          <Spinner label="Loading options" />
        </div>
      );
    }
    if (optionTypesQuery.isError) {
      return <Alert tone="danger">Couldn&apos;t load the options. Try again.</Alert>;
    }
    if (isEverythingTaken) {
      return (
        <div className="grid gap-2 text-sm text-text-secondary">
          <div className="font-medium text-text-primary">Every combination already exists</div>
          <div>
            All {combinations.length} {optionTypeNames.join(' × ')} combinations are variants. Add a
            new value under <span className="font-medium">Option types</span> to create more.
          </div>
        </div>
      );
    }
    return (
      <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-3.5">
        {saveError ? <Alert tone="danger">{saveError}</Alert> : null}
        <div className="flex gap-3.5 [&>*]:flex-1">
          {productOptionTypes.map((optionType) => (
            <Select
              key={optionType.id}
              label={optionType.name}
              placeholder={selectedValueIds[optionType.id] === undefined ? 'Pick one' : undefined}
              value={String(selectedValueIds[optionType.id] ?? '')}
              options={optionType.values.map((value) => ({
                value: String(value.id),
                label: value.value,
              }))}
              onChange={(event) => chooseValue(optionType.id, Number(event.target.value))}
            />
          ))}
        </div>
        {isDuplicate ? (
          <div role="alert" className="text-[13px] text-danger-600">
            {selectedLabel} already exists.
          </div>
        ) : null}
        {canSetPrices || canRecordStock ? (
          <div className={cn('grid gap-3.5', canSetPrices && canRecordStock && 'grid-cols-2')}>
            {canSetPrices ? (
              <Input
                label="Price"
                prefix="KES"
                inputMode="decimal"
                placeholder={product.price?.amount ?? '0.00'}
                value={price}
                error={fieldErrors.price}
                onChange={(event) => setPrice(event.target.value)}
              />
            ) : null}
            {canRecordStock ? (
              <Input
                label="Opening stock"
                suffix="units"
                inputMode="numeric"
                placeholder="0"
                hint="Recorded as a receipt"
                value={stock}
                error={fieldErrors.stock}
                onChange={(event) => setStock(event.target.value)}
              />
            ) : null}
          </div>
        ) : null}
        <div className="text-[13px] text-text-tertiary">
          Need a new size or colour? Add it under{' '}
          <span className="font-medium text-text-secondary">Option types</span> first.
        </div>
      </form>
    );
  }

  return (
    <Dialog
      isOpen
      title="Add variant"
      description={
        optionTypeNames.length > 0
          ? `Pick a value for each option. Options for this product: ${optionTypeNames.join(', ')}.`
          : 'Pick a value for each option.'
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={
              !optionTypesQuery.isSuccess || !isComplete || isDuplicate || isEverythingTaken
            }
            isLoading={isAdding}
          >
            Add variant
          </Button>
        </>
      }
    >
      {renderBody()}
    </Dialog>
  );
}
