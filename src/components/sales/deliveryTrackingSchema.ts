import { z } from 'zod';

const TRACKING_NUMBER_MAXIMUM_LENGTH = 100;

// `courierId` is the Select's value: a courier id as a string, or '' when none is chosen.
export const deliveryTrackingSchema = z.object({
  courierId: z.string(),
  trackingNumber: z
    .string()
    .trim()
    .max(TRACKING_NUMBER_MAXIMUM_LENGTH, 'Keep the tracking number to 100 characters or fewer'),
});

export type DeliveryTrackingInput = z.infer<typeof deliveryTrackingSchema>;
