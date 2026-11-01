import { z } from 'zod';

import { isValidPrice } from '@/utils/money';

const FREE_FEE_PATTERN = /^0+(\.0{1,2})?$/;

// A delivery fee is a price, or zero for free delivery (which a price can't be).
export function isValidDeliveryFee(value: string): boolean {
  return FREE_FEE_PATTERN.test(value.trim()) || isValidPrice(value);
}

export const deliveryFeeSchema = z.object({
  fee: z.string().refine(isValidDeliveryFee, 'Enter a fee — 0 for free'),
});

export type DeliveryFeeInput = z.infer<typeof deliveryFeeSchema>;
