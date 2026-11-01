import { z } from 'zod';

const CANCEL_REASON_MAXIMUM_LENGTH = 255;

export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Give a reason')
    .max(CANCEL_REASON_MAXIMUM_LENGTH, 'Keep the reason to 255 characters or fewer'),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
