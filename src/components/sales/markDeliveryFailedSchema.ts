import { z } from 'zod';

const FAILURE_REASON_MAXIMUM_LENGTH = 255;

export const markDeliveryFailedSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Give a reason')
    .max(FAILURE_REASON_MAXIMUM_LENGTH, 'Keep the reason to 255 characters or fewer'),
});

export type MarkDeliveryFailedInput = z.infer<typeof markDeliveryFailedSchema>;
