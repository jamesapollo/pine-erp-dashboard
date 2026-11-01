import { z } from 'zod';

import { MAX_PRODUCT_IMAGES } from '@/utils/imageFiles';
import { isValidPrice } from '@/utils/money';

export const MAXIMUM_VARIANT_ROWS = 200;

const MAXIMUM_OPENING_STOCK = 1_000_000;
const PRICE_FORMAT_MESSAGE = 'Enter a price like 4500 or 4500.50';

export type SaveIntent = 'draft' | 'publish';

export function isValidOpeningStock(value: string): boolean {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) && Number(trimmed) <= MAXIMUM_OPENING_STOCK;
}

// A row field is missing when its input isn't shown (no pricing.manage or inventory.manage).
const rowSchema = z.object({
  price: z
    .string()
    .optional()
    .refine((value = '') => value.trim() === '' || isValidPrice(value), PRICE_FORMAT_MESSAGE),
  stock: z
    .string()
    .optional()
    .refine(
      (value = '') => value.trim() === '' || isValidOpeningStock(value),
      'Enter a whole number of units',
    ),
});

const baseSchema = z.object({
  title: z.string().trim().min(1, 'Give the product a name'),
  description: z.string(),
  categoryId: z.number().optional(),
  basePrice: z.string(),
  isFeatured: z.boolean(),
  optionTypeIds: z.array(z.number()),
  selectedValueIds: z.record(z.string(), z.array(z.number())),
  rows: z.record(z.string(), rowSchema),
  images: z.array(z.instanceof(File)).max(MAX_PRODUCT_IMAGES),
});

export type ProductNewInput = z.infer<typeof baseSchema>;

// Form paths treat a numeric segment as an array index, so a combination key such as "2" or
// "1-11" is stored under a prefixed name.
export function rowFieldKey(combinationKey: string): string {
  return `variant-${combinationKey}`;
}

// Save draft needs only a name (and well-formed numbers where something was typed);
// Publish also needs a category and a base price above 0.
export function productNewSchema(intent: SaveIntent) {
  return baseSchema.superRefine((input, context) => {
    const hasBasePrice = input.basePrice.trim() !== '';
    if (intent === 'publish') {
      if (input.categoryId === undefined) {
        context.addIssue({ code: 'custom', path: ['categoryId'], message: 'Pick a category' });
      }
      if (!hasBasePrice || !(Number(input.basePrice.replaceAll(',', '')) > 0)) {
        context.addIssue({ code: 'custom', path: ['basePrice'], message: 'Set a price above 0' });
        return;
      }
    }
    if (hasBasePrice && !isValidPrice(input.basePrice)) {
      context.addIssue({ code: 'custom', path: ['basePrice'], message: PRICE_FORMAT_MESSAGE });
    }
  });
}

export const productNewDefaultValues: ProductNewInput = {
  title: '',
  description: '',
  categoryId: undefined,
  basePrice: '',
  isFeatured: false,
  optionTypeIds: [],
  selectedValueIds: {},
  rows: {},
  images: [],
};
