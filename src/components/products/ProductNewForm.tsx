import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { FormProvider, useForm, useWatch, type Resolver } from 'react-hook-form';
import { Send } from 'lucide-react';

import { type ValidationErrorBody } from '@/types/apiErrors';
import { useCategoriesQuery } from '@/hooks/api/queries/catalogue/useCategoriesQuery';
import { useOptionTypesQuery } from '@/hooks/api/queries/catalogue/useOptionTypesQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { selectedOptionTypes, useCreateProductFlow } from '@/hooks/useCreateProductFlow';
import { Alert } from '@/components/ui/Alert';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { NewVariantsTable } from '@/components/products/NewVariantsTable';
import { OptionPicker } from '@/components/products/OptionPicker';
import { PendingImages } from '@/components/products/PendingImages';
import {
  MAXIMUM_VARIANT_ROWS,
  productNewDefaultValues,
  productNewSchema,
  type ProductNewInput,
  type SaveIntent,
} from '@/components/products/productNewSchema';
import { PublishChecklist } from '@/components/products/PublishChecklist';
import { getActionErrorMessage, getFieldError, isStatus } from '@/utils/apiErrors';
import { flattenCategoryTree, indentCategoryLabel } from '@/utils/categoryTree';
import { buildVariantCombinations } from '@/utils/variantCombinations';
import { ROUTES } from '@/constants/routes';

// Create-product 422 keys that belong to a form field; anything else goes in the page alert.
const fieldForApiKey: Record<string, keyof ProductNewInput> = {
  title: 'title',
  description: 'description',
  category_ids: 'categoryId',
  'category_ids.0': 'categoryId',
  price: 'basePrice',
};

function getPageErrorMessage(error: unknown): string | undefined {
  if (error === undefined) return undefined;
  if (!isStatus(error, 422) || !isAxiosError<Partial<ValidationErrorBody>>(error)) {
    return getActionErrorMessage(error);
  }
  const fieldErrors = Object.entries(error.response?.data?.errors ?? {});
  const otherMessages = fieldErrors
    .filter(([key]) => !(key in fieldForApiKey))
    .flatMap(([, messages]) => messages.slice(0, 1));
  if (otherMessages.length > 0) return otherMessages.join(' ');
  return fieldErrors.length === 0 ? getActionErrorMessage(error) : undefined;
}

function hasEnteredAnything(input: ProductNewInput): boolean {
  return (
    input.title.trim() !== '' ||
    input.description.trim() !== '' ||
    input.basePrice.trim() !== '' ||
    input.categoryId !== undefined ||
    input.isFeatured ||
    input.optionTypeIds.length > 0 ||
    input.images.length > 0 ||
    Object.values(input.rows).some(
      (row) => (row?.price ?? '').trim() !== '' || (row?.stock ?? '').trim() !== '',
    )
  );
}

export function ProductNewForm() {
  const navigate = useNavigate();
  const { hasPermission } = useAuthedSession();
  const canSetPrices = hasPermission('pricing.manage');
  const canRecordStock = hasPermission('inventory.manage');
  const optionTypesQuery = useOptionTypesQuery();
  const categoriesQuery = useCategoriesQuery();
  const flow = useCreateProductFlow();
  const [pendingIntent, setPendingIntent] = useState<SaveIntent>('draft');
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);

  // Which rules apply depends on the button pressed, so the resolver reads it at submit time.
  const intentRef = useRef<SaveIntent>('draft');
  const resolver = useMemo<Resolver<ProductNewInput>>(
    () => (values, context, options) =>
      zodResolver(productNewSchema(intentRef.current))(values, context, options),
    [],
  );

  const form = useForm<ProductNewInput>({
    defaultValues: productNewDefaultValues,
    resolver,
    mode: 'onSubmit',
  });
  const {
    control,
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = form;

  const { fieldErrors } = flow;
  useEffect(() => {
    if (!isStatus(fieldErrors, 422)) return;
    for (const [apiKey, field] of Object.entries(fieldForApiKey)) {
      const message = getFieldError(fieldErrors, apiKey);
      if (message) setError(field, { message });
    }
  }, [fieldErrors, setError]);
  const pageErrorMessage = getPageErrorMessage(fieldErrors);

  const optionTypes = useMemo(() => optionTypesQuery.data ?? [], [optionTypesQuery.data]);
  const [optionTypeIds, selectedValueIds] = useWatch({
    control,
    name: ['optionTypeIds', 'selectedValueIds'],
  });
  const combinations = useMemo(
    () =>
      buildVariantCombinations(
        selectedOptionTypes({ optionTypeIds, selectedValueIds }, optionTypes),
      ),
    [optionTypeIds, selectedValueIds, optionTypes],
  );
  const hasTooManyVariants = combinations.length > MAXIMUM_VARIANT_ROWS;

  const categoryOptions = flattenCategoryTree(categoriesQuery.data ?? []).map(
    ({ category, depth }) => ({
      value: String(category.id),
      label: indentCategoryLabel(category.name, depth),
    }),
  );

  const isBusy = isSubmitting || flow.isSaving;

  function submit(intent: SaveIntent) {
    if (isBusy) return;
    intentRef.current = intent;
    setPendingIntent(intent);
    void handleSubmit((input) => flow.save(input, intent))();
  }

  function discard() {
    if (hasEnteredAnything(getValues())) setIsDiscardOpen(true);
    else navigate(ROUTES.PRODUCTS);
  }

  return (
    <FormProvider {...form}>
      <PageHeader
        title="Add product"
        sub="Save as a draft any time — it stays hidden until you publish."
        back={<BackLink to={ROUTES.PRODUCTS}>Products</BackLink>}
        actions={
          <>
            <Button variant="secondary" onClick={discard}>
              Discard
            </Button>
            <Button
              variant="secondary"
              disabled={isBusy || hasTooManyVariants}
              isLoading={isBusy && pendingIntent === 'draft'}
              onClick={() => submit('draft')}
            >
              Save draft
            </Button>
            <Button
              disabled={isBusy || hasTooManyVariants || !canSetPrices}
              isLoading={isBusy && pendingIntent === 'publish'}
              onClick={() => submit('publish')}
            >
              <Icon icon={Send} size={16} />
              Publish
            </Button>
          </>
        }
      />
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit('draft');
        }}
        className="flex flex-col gap-4"
      >
        {pageErrorMessage ? <Alert tone="danger">{pageErrorMessage}</Alert> : null}
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-[1.7_1_560px] flex-col gap-4">
            <Card title="Details">
              <div className="grid gap-3.5">
                <Input
                  label="Name"
                  placeholder="Ankara wrap dress"
                  error={errors.title?.message}
                  {...register('title')}
                />
                <Textarea
                  label="Description"
                  optional
                  rows={4}
                  placeholder="Fabric, fit, care instructions"
                  error={errors.description?.message}
                  {...register('description')}
                />
                <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
                  <Select
                    label="Category"
                    placeholder="Choose…"
                    options={categoryOptions}
                    error={errors.categoryId?.message}
                    {...register('categoryId', {
                      setValueAs: (value: unknown) =>
                        value === '' || value === undefined ? undefined : Number(value),
                    })}
                  />
                  <Input
                    label="Base price"
                    prefix="KES"
                    placeholder="0.00"
                    inputMode="decimal"
                    disabled={!canSetPrices}
                    hint={
                      canSetPrices
                        ? 'Variants inherit this unless you override it'
                        : "You can't set prices"
                    }
                    error={errors.basePrice?.message}
                    {...register('basePrice')}
                  />
                </div>
              </div>
            </Card>
            <PendingImages />
            <Card
              title="Options"
              subtitle="Each combination of values becomes a variant with its own SKU and stock"
            >
              {optionTypesQuery.isError ? (
                <Alert tone="danger">Couldn&apos;t load option types. Try again.</Alert>
              ) : (
                <OptionPicker optionTypes={optionTypes} />
              )}
            </Card>
            <Card
              title="Variants"
              subtitle={`${combinations.length} ${combinations.length === 1 ? 'variant' : 'variants'} · SKUs are generated automatically`}
              flush
            >
              <NewVariantsTable
                combinations={combinations}
                canSetPrices={canSetPrices}
                canRecordStock={canRecordStock}
              />
            </Card>
          </div>
          <div className="sticky top-4 flex min-w-0 flex-[1_1_300px] flex-col gap-4">
            <Card title="Visibility">
              <div className="grid gap-3.5">
                <Switch label="Feature on homepage when published" {...register('isFeatured')} />
                <div className="text-[13px] text-text-tertiary">
                  Drafts are hidden from the storefront. Opening stock is recorded as a receipt.
                </div>
              </div>
            </Card>
            <PublishChecklist />
          </div>
        </div>
      </form>
      <Dialog
        isOpen={isDiscardOpen}
        title="Discard this product?"
        description="What you've entered will be lost."
        onClose={() => setIsDiscardOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsDiscardOpen(false)}>
              Keep editing
            </Button>
            <Button variant="danger" onClick={() => navigate(ROUTES.PRODUCTS)}>
              Discard
            </Button>
          </>
        }
      />
    </FormProvider>
  );
}
