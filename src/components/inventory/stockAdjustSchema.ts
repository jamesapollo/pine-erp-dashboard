import { z } from 'zod';

import { type CreateStockAdjustmentBody } from '@/hooks/api/mutations/inventory/useCreateStockAdjustmentMutation';

export type StockAdjustMode = 'receipt' | 'remove' | 'count';

export const MAX_CHANGE = 100_000;
export const MAX_ON_HAND = 1_000_000;
/** The API needs a reason; a receipt without one is recorded with this. */
export const DEFAULT_RECEIPT_REASON = 'Stock received';

export type StockAdjustInput = { mode: StockAdjustMode; quantity: string; reason: string };

/** On hand after the adjustment, or undefined until the quantity is a whole number. */
export function getOnHandAfter(onHand: number, mode: StockAdjustMode, quantity: string) {
  const trimmed = quantity.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  const units = Number(trimmed);
  if (mode === 'count') return units;
  return mode === 'receipt' ? onHand + units : onHand - units;
}

export function buildStockAdjustSchema(onHand: number) {
  return z
    .object({
      mode: z.enum(['receipt', 'remove', 'count']),
      quantity: z.string(),
      reason: z.string().max(255, 'Keep the reason under 255 characters.'),
    })
    .superRefine(({ mode, quantity, reason }, context) => {
      const addIssue = (path: 'quantity' | 'reason', message: string) =>
        context.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

      if (mode !== 'receipt' && reason.trim() === '') {
        addIssue('reason', 'Say why — it’s kept on the record.');
      }

      const trimmed = quantity.trim();
      if (!/^\d+$/.test(trimmed) || (mode !== 'count' && Number(trimmed) === 0)) {
        addIssue('quantity', 'Enter a whole number.');
        return;
      }
      const units = Number(trimmed);
      if (mode !== 'count' && units > MAX_CHANGE) {
        addIssue('quantity', 'Enter at most 100,000 units at a time.');
      } else if (mode === 'remove' && units > onHand) {
        addIssue('quantity', `Only ${Math.max(onHand, 0)} on hand.`);
      } else if (mode === 'count' && units === onHand) {
        addIssue('quantity', 'Same as on hand — nothing to change.');
      } else if ((getOnHandAfter(onHand, mode, trimmed) ?? 0) > MAX_ON_HAND) {
        addIssue('quantity', 'Stock can’t go above 1,000,000.');
      }
    });
}

export function toStockAdjustmentBody(
  variantId: number,
  { mode, quantity, reason }: StockAdjustInput,
): CreateStockAdjustmentBody {
  const units = Number(quantity.trim());
  const trimmedReason = reason.trim();
  if (mode === 'receipt') {
    return {
      variant_id: variantId,
      type: 'receipt',
      change: units,
      reason: trimmedReason || DEFAULT_RECEIPT_REASON,
    };
  }
  if (mode === 'remove') {
    return { variant_id: variantId, type: 'adjustment', change: -units, reason: trimmedReason };
  }
  return { variant_id: variantId, type: 'adjustment', set_to: units, reason: trimmedReason };
}
