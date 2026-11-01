import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { type OptionType, type Product } from '@/types/catalogue';
import { createProduct } from '@/hooks/api/mutations/catalogue/useCreateProductMutation';
import { createVariant } from '@/hooks/api/mutations/catalogue/useCreateVariantMutation';
import { publishProduct } from '@/hooks/api/mutations/catalogue/usePublishProductMutation';
import { updateVariant } from '@/hooks/api/mutations/catalogue/useUpdateVariantMutation';
import { uploadProductImage } from '@/hooks/api/mutations/catalogue/useUploadProductImageMutation';
import { createStockAdjustment } from '@/hooks/api/mutations/inventory/useCreateStockAdjustmentMutation';
import { useOptionTypesQuery } from '@/hooks/api/queries/catalogue/useOptionTypesQuery';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import {
  rowFieldKey,
  type ProductNewInput,
  type SaveIntent,
} from '@/components/products/productNewSchema';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { toMoneyInput } from '@/utils/money';
import { formatSaveIssues } from '@/utils/saveIssues';
import { buildVariantCombinations, type VariantCombination } from '@/utils/variantCombinations';
import { buildProductPath } from '@/constants/routes';

export const OPENING_STOCK_REASON = 'Opening stock';

const emptyOptionTypes: OptionType[] = [];

export type ProductDetailLocationState = { saveIssues?: string };

export function selectedOptionTypes(
  input: Pick<ProductNewInput, 'optionTypeIds' | 'selectedValueIds'>,
  optionTypes: OptionType[],
) {
  return input.optionTypeIds.flatMap((optionTypeId) => {
    const optionType = optionTypes.find((candidate) => candidate.id === optionTypeId);
    return optionType ? [{ optionType, valueIds: input.selectedValueIds[optionTypeId] ?? [] }] : [];
  });
}

function rowPrice(input: ProductNewInput, combination: VariantCombination): string | undefined {
  const price = input.rows[rowFieldKey(combination.key)]?.price?.trim() ?? '';
  return price ? toMoneyInput(price) : undefined;
}

function rowStock(input: ProductNewInput, combination: VariantCombination): number {
  const stock = input.rows[rowFieldKey(combination.key)]?.stock?.trim() ?? '';
  return stock ? Number(stock) : 0;
}

/**
 * Add product's save: create the draft, then its variants, opening stock, images and (for
 * Publish) publishing, in that order. If creating the product fails the form keeps the error to
 * show on its fields. Once the product exists, any failure stops the run and lands the user on
 * the saved draft with a message naming everything that didn't save.
 */
export function useCreateProductFlow() {
  const { store, hasPermission } = useAuthedSession();
  const { data: optionTypes = emptyOptionTypes } = useOptionTypesQuery();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<unknown>(undefined);
  const isSavingRef = useRef(false);

  const canSetPrices = hasPermission('pricing.manage');
  const canRecordStock = hasPermission('inventory.manage');

  const save = useCallback(
    async (input: ProductNewInput, intent: SaveIntent) => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      setIsSaving(true);
      setFieldErrors(undefined);

      const combinations = buildVariantCombinations(selectedOptionTypes(input, optionTypes));
      const hasOptions = input.optionTypeIds.length > 0;
      const description = input.description.trim();
      const basePrice = input.basePrice.trim();

      let product: Product;
      try {
        product = await createProduct(store.id, {
          title: input.title.trim(),
          description: description || null,
          category_ids: input.categoryId === undefined ? [] : [input.categoryId],
          ...(canSetPrices && basePrice ? { price: toMoneyInput(basePrice) } : {}),
          is_featured: input.isFeatured,
          option_type_ids: input.optionTypeIds,
        });
      } catch (error) {
        setFieldErrors(error);
        isSavingRef.current = false;
        setIsSaving(false);
        return;
      }

      // What is still to do; each list shrinks as its calls succeed, so a failure can say exactly
      // what didn't save.
      const pendingVariants = hasOptions
        ? [...combinations]
        : combinations.filter((combination) => canSetPrices && rowPrice(input, combination));
      const pendingStock = canRecordStock
        ? combinations.filter((combination) => rowStock(input, combination) > 0)
        : [];
      const pendingImages = [...input.images];
      let isPublishPending = intent === 'publish';
      const variantIds = new Map<string, number>();
      const defaultVariant =
        product.variants.find((variant) => variant.is_default) ?? product.variants[0];
      if (!hasOptions && defaultVariant) {
        for (const combination of combinations) variantIds.set(combination.key, defaultVariant.id);
      }

      try {
        while (pendingVariants.length > 0) {
          const combination = pendingVariants[0];
          const price = canSetPrices ? rowPrice(input, combination) : undefined;
          if (hasOptions) {
            const variant = await createVariant(store.id, product.id, {
              option_value_ids: combination.optionValueIds,
              ...(price ? { price } : {}),
            });
            variantIds.set(combination.key, variant.id);
          } else if (price) {
            if (!defaultVariant) throw new Error('The product came back without its variant.');
            await updateVariant(store.id, product.id, defaultVariant.id, { price });
          }
          pendingVariants.shift();
        }

        while (pendingStock.length > 0) {
          const combination = pendingStock[0];
          const variantId = variantIds.get(combination.key);
          if (variantId === undefined)
            throw new Error('The product came back without its variant.');
          await createStockAdjustment(store.id, {
            variant_id: variantId,
            type: 'receipt',
            change: rowStock(input, combination),
            reason: OPENING_STOCK_REASON,
          });
          pendingStock.shift();
        }

        while (pendingImages.length > 0) {
          await uploadProductImage(store.id, product.id, pendingImages[0], product.title);
          pendingImages.shift();
        }

        if (isPublishPending) {
          await publishProduct(store.id, product.id);
          isPublishPending = false;
        }
      } catch (error) {
        const saveIssues = formatSaveIssues({
          variants: pendingVariants.length,
          stock: pendingStock.length,
          images: pendingImages.length,
          publish: isPublishPending,
          message: getActionErrorMessage(error),
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) });
        isSavingRef.current = false;
        setIsSaving(false);
        navigate(buildProductPath(product.id), {
          state: { saveIssues } satisfies ProductDetailLocationState,
        });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) });
      isSavingRef.current = false;
      setIsSaving(false);
      showToast({
        title: intent === 'publish' ? 'Product published' : 'Draft saved',
        description: product.title,
      });
      navigate(buildProductPath(product.id));
    },
    [canRecordStock, canSetPrices, navigate, optionTypes, queryClient, showToast, store.id],
  );

  return { save, isSaving, fieldErrors };
}
