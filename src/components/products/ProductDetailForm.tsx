import { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';

import { type Category, type Product } from '@/types/catalogue';
import { useArchiveProductMutation } from '@/hooks/api/mutations/catalogue/useArchiveProductMutation';
import { usePublishProductMutation } from '@/hooks/api/mutations/catalogue/usePublishProductMutation';
import { useUnpublishProductMutation } from '@/hooks/api/mutations/catalogue/useUnpublishProductMutation';
import {
  storeProductResponse,
  updateProduct,
} from '@/hooks/api/mutations/catalogue/useUpdateProductMutation';
import { updateVariant } from '@/hooks/api/mutations/catalogue/useUpdateVariantMutation';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { Alert } from '@/components/ui/Alert';
import { useToastContext } from '@/components/ui/ToastContext';
import { ArchiveProductDialog } from '@/components/products/ArchiveProductDialog';
import { InventoryCard } from '@/components/products/InventoryCard';
import {
  ProductDetailHeader,
  type ProductStatusAction,
} from '@/components/products/ProductDetailHeader';
import { ProductDetailsCard } from '@/components/products/ProductDetailsCard';
import {
  buildProductChanges,
  buildVariantPriceChanges,
  productDetailDefaultValues,
  productDetailSchema,
  type ProductDetailInput,
} from '@/components/products/productDetailSchema';
import { PricingCard } from '@/components/products/PricingCard';
import { UnsavedChangesDialog } from '@/components/products/UnsavedChangesDialog';
import { VisibilityCard } from '@/components/products/VisibilityCard';
import { getActionErrorMessage, getFieldError, isStatus } from '@/utils/apiErrors';
import { flattenCategoryTree } from '@/utils/categoryTree';
import { summarizeProduct } from '@/utils/productSummary';

// Product update 422 keys that belong to a form field. The message also shows in the page alert.
const fieldForApiKey: Record<string, keyof ProductDetailInput> = {
  title: 'title',
  description: 'description',
  slug: 'slug',
  category_ids: 'categoryId',
  'category_ids.0': 'categoryId',
  price: 'basePrice',
};

function buildHeaderSub(product: Product, categories: Category[], onHand: number): string {
  const categoryName = flattenCategoryTree(categories).find(
    ({ category }) => category.id === product.category_ids[0],
  )?.category.name;
  const variantCount = product.variants.length;
  return [
    categoryName,
    `${variantCount} ${variantCount === 1 ? 'variant' : 'variants'}`,
    `${onHand} on hand`,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * The product detail screen once the product has loaded. Details, featured and prices are
 * edited in one form and sent by "Save changes"; status actions apply straight away and leave
 * unsaved edits in place.
 */
export function ProductDetailForm({
  product,
  categories,
  saveIssues,
}: {
  product: Product;
  categories: Category[];
  saveIssues?: string;
}) {
  const { store, hasPermission } = useAuthedSession();
  const canManage = hasPermission('catalogue.manage');
  const canSetPrices = hasPermission('pricing.manage');
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  const publishMutation = usePublishProductMutation();
  const unpublishMutation = useUnpublishProductMutation();
  const archiveMutation = useArchiveProductMutation();

  const [savedValues, setSavedValues] = useState(() => productDetailDefaultValues(product));
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const form = useForm<ProductDetailInput>({
    defaultValues: savedValues,
    resolver: zodResolver(productDetailSchema),
    mode: 'onSubmit',
  });
  const {
    handleSubmit,
    reset,
    setError,
    formState: { isDirty },
  } = form;

  const isReadOnly = !canManage || product.status === 'archived';
  const summary = summarizeProduct(product);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !isSaving && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!isDirty) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);

  let pendingAction: ProductStatusAction | undefined;
  if (publishMutation.isPending) pendingAction = 'publish';
  else if (archiveMutation.isPending) pendingAction = 'archive';
  else if (unpublishMutation.isPending) {
    pendingAction = unpublishMutation.variables.isRestoring ? 'restore' : 'unpublish';
  }

  function onActionError(error: unknown) {
    setActionError(getActionErrorMessage(error));
  }

  function runStatusAction(action: ProductStatusAction) {
    setActionError(undefined);
    if (action === 'archive') {
      setIsArchiveOpen(true);
    } else if (action === 'publish') {
      publishMutation.mutate(product.id, { onError: onActionError });
    } else {
      unpublishMutation.mutate(
        { productId: product.id, isRestoring: action === 'restore' },
        { onError: onActionError },
      );
    }
  }

  function confirmArchive() {
    archiveMutation.mutate(product.id, {
      onSuccess: () => setIsArchiveOpen(false),
      onError: (error) => {
        setIsArchiveOpen(false);
        onActionError(error);
      },
    });
  }

  // PATCH the product (changed fields only), then each changed variant price, in order. What
  // saved stays saved; a failure keeps the unsaved edits in the form and shows in the alert.
  async function save(input: ProductDetailInput) {
    setActionError(undefined);
    setIsSaving(true);
    const productBody = buildProductChanges(input, savedValues, { canSetPrices });
    const variantChanges = buildVariantPriceChanges(input, savedValues, {
      canSetPrices,
      variantIds: product.variants.map((variant) => variant.id),
    });
    let latest = product;
    let failure: unknown;
    let failedVariantId: number | undefined;
    try {
      if (Object.keys(productBody).length > 0) {
        latest = await updateProduct(store.id, product.id, productBody);
      }
      for (const { variantId, price } of variantChanges) {
        failedVariantId = variantId;
        const variant = await updateVariant(store.id, product.id, variantId, { price });
        latest = {
          ...latest,
          variants: latest.variants.map((existing) =>
            existing.id === variant.id ? variant : existing,
          ),
        };
      }
      failedVariantId = undefined;
    } catch (error) {
      failure = error;
    }

    if (latest !== product) await storeProductResponse(queryClient, store.id, latest);
    const latestValues = productDetailDefaultValues(latest);
    setSavedValues(latestValues);
    setIsSaving(false);

    if (failure === undefined) {
      reset(latestValues);
      showToast({ title: 'Product saved', description: latest.title });
      return;
    }

    reset(latestValues, { keepValues: true });
    setActionError(getActionErrorMessage(failure));
    if (!isStatus(failure, 422)) return;
    if (failedVariantId === undefined) {
      for (const [apiKey, field] of Object.entries(fieldForApiKey)) {
        const message = getFieldError(failure, apiKey);
        if (message) setError(field, { message });
      }
    } else {
      const message = getFieldError(failure, 'price');
      if (message) setError(`variantPrices.${failedVariantId}`, { message });
    }
  }

  function submit() {
    if (isReadOnly || isSaving) return;
    void handleSubmit(save)();
  }

  return (
    <FormProvider {...form}>
      <ProductDetailHeader
        title={product.title}
        status={product.status}
        sub={buildHeaderSub(product, categories, summary.onHand)}
        canManage={canManage}
        isDirty={isDirty}
        isSaving={isSaving}
        pendingAction={pendingAction}
        onSave={submit}
        onStatusAction={runStatusAction}
      />
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        {saveIssues ? <Alert tone="warning">{saveIssues}</Alert> : null}
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-[1.7_1_560px] flex-col gap-4">
            <ProductDetailsCard categories={categories} isReadOnly={isReadOnly} />
            {/* The Images card goes here, then the tabbed Variants / Stock history card. */}
          </div>
          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
            <VisibilityCard status={product.status} isReadOnly={isReadOnly} />
            <PricingCard
              priceRange={summary.priceRange}
              canSetPrices={canSetPrices}
              isReadOnly={isReadOnly}
            />
            <InventoryCard summary={summary} />
          </div>
        </div>
      </form>
      <ArchiveProductDialog
        isOpen={isArchiveOpen}
        isArchiving={archiveMutation.isPending}
        onClose={() => setIsArchiveOpen(false)}
        onConfirm={confirmArchive}
      />
      <UnsavedChangesDialog
        isOpen={blocker.state === 'blocked'}
        onKeepEditing={() => blocker.reset?.()}
        onDiscard={() => blocker.proceed?.()}
      />
    </FormProvider>
  );
}
