import { z } from 'zod';

import { isValidPrice } from '@/utils/money';

const PERCENTAGE_PATTERN = /^\d+(\.\d{1,2})?$/;

export type OfferInput = {
  name: string;
  type: 'percent_off' | 'sale_price';
  value: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  categoryIds: number[];
  productIds: number[];
};

function isValidPercentage(value: string): boolean {
  const trimmed = value.trim();
  if (!PERCENTAGE_PATTERN.test(trimmed)) return false;
  const percentage = Number(trimmed);
  return percentage > 0 && percentage < 100;
}

/**
 * `variantCount` is the variants the offer already targets: they are chosen outside this screen and
 * kept on save, so they count towards "at least one target".
 */
export function buildOfferSchema(variantCount: number) {
  // Every rule sits in one refinement, so a first submit shows all the problems at once.
  return z
    .object({
      name: z.string(),
      type: z.enum(['percent_off', 'sale_price']),
      value: z.string(),
      startsAt: z.string(),
      endsAt: z.string(),
      isActive: z.boolean(),
      categoryIds: z.array(z.number()),
      productIds: z.array(z.number()),
    })
    .superRefine((offer, context) => {
      const name = offer.name.trim();
      if (!name) context.addIssue({ code: 'custom', path: ['name'], message: 'Name the offer.' });
      if (name.length > 120) {
        context.addIssue({
          code: 'custom',
          path: ['name'],
          message: 'Keep the name to 120 characters.',
        });
      }
      if (offer.type === 'percent_off' && !isValidPercentage(offer.value)) {
        context.addIssue({
          code: 'custom',
          path: ['value'],
          message: 'Enter a percentage between 0 and 100.',
        });
      }
      if (offer.type === 'sale_price' && !isValidPrice(offer.value)) {
        context.addIssue({ code: 'custom', path: ['value'], message: 'Enter a valid price.' });
      }
      if (!offer.startsAt) {
        context.addIssue({
          code: 'custom',
          path: ['startsAt'],
          message: 'Choose when the offer starts.',
        });
      }
      if (!offer.endsAt) {
        context.addIssue({
          code: 'custom',
          path: ['endsAt'],
          message: 'Choose when the offer ends.',
        });
      }
      if (offer.startsAt && offer.endsAt && new Date(offer.endsAt) <= new Date(offer.startsAt)) {
        context.addIssue({ code: 'custom', path: ['endsAt'], message: 'Must be after the start.' });
      }
      if (offer.categoryIds.length + offer.productIds.length + variantCount === 0) {
        context.addIssue({
          code: 'custom',
          path: ['categoryIds'],
          message: 'Pick at least one category or product.',
        });
      }
    });
}
