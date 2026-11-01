import { z } from 'zod';

import { type Product } from '@/types/catalogue';
import { type UpdateProductBody } from '@/hooks/api/mutations/catalogue/useUpdateProductMutation';
import { isValidPrice, toMoneyInput } from '@/utils/money';

const PRICE_FORMAT_MESSAGE = 'Enter a price like 4500 or 4500.50';
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isBlankOrPrice(value: string): boolean {
  return value.trim() === '' || isValidPrice(value);
}

export const productDetailSchema = z.object({
  title: z.string().trim().min(1, 'Give the product a name'),
  description: z.string(),
  categoryId: z.number().optional(),
  slug: z
    .string()
    .trim()
    .min(1, 'Give the product a URL handle')
    .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and hyphens'),
  isFeatured: z.boolean(),
  basePrice: z.string().refine(isBlankOrPrice, PRICE_FORMAT_MESSAGE),
  // Blank means the variant inherits the base price.
  variantPrices: z.record(z.string(), z.string().refine(isBlankOrPrice, PRICE_FORMAT_MESSAGE)),
});

// variantPrices is keyed by variant id. Object keys are strings at runtime, and form paths
// (`variantPrices.${variantId}`) only type-check against string keys, so the record says so;
// indexing it with a numeric id still works.
export type ProductDetailInput = z.infer<typeof productDetailSchema>;

export function productDetailDefaultValues(product: Product): ProductDetailInput {
  return {
    title: product.title,
    description: product.description ?? '',
    categoryId: product.category_ids[0],
    slug: product.slug,
    isFeatured: product.is_featured,
    basePrice: product.price?.amount ?? '',
    variantPrices: Object.fromEntries(
      product.variants.map((variant) => [variant.id, variant.price?.amount ?? '']),
    ),
  };
}

function toPriceBody(value: string): string | null {
  return value.trim() === '' ? null : toMoneyInput(value);
}

function isSamePrice(first: string, second: string): boolean {
  return toPriceBody(first) === toPriceBody(second);
}

/** The product PATCH body: only fields that differ from what was loaded. */
export function buildProductChanges(
  input: ProductDetailInput,
  saved: ProductDetailInput,
  { canSetPrices }: { canSetPrices: boolean },
): UpdateProductBody {
  const body: UpdateProductBody = {};
  if (input.title.trim() !== saved.title) body.title = input.title.trim();
  const description = input.description.trim() === '' ? '' : input.description;
  if (description !== saved.description) body.description = description === '' ? null : description;
  if (input.categoryId !== saved.categoryId) {
    body.category_ids = input.categoryId === undefined ? [] : [input.categoryId];
  }
  if (input.slug.trim() !== saved.slug) body.slug = input.slug.trim();
  if (input.isFeatured !== saved.isFeatured) body.is_featured = input.isFeatured;
  if (canSetPrices && !isSamePrice(input.basePrice, saved.basePrice)) {
    body.price = toPriceBody(input.basePrice);
  }
  return body;
}

/** Variant price changes to send after the product, in the product's variant order. */
export function buildVariantPriceChanges(
  input: ProductDetailInput,
  saved: ProductDetailInput,
  { canSetPrices, variantIds }: { canSetPrices: boolean; variantIds: number[] },
): { variantId: number; price: string | null }[] {
  if (!canSetPrices) return [];
  return variantIds.flatMap((variantId) => {
    const savedPrice = saved.variantPrices[variantId] ?? '';
    const price = input.variantPrices[variantId] ?? savedPrice;
    return isSamePrice(price, savedPrice) ? [] : [{ variantId, price: toPriceBody(price) }];
  });
}
