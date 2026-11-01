import { z } from 'zod';

const TRACKING_NUMBER_MAXIMUM_LENGTH = 100;

// `courierId` is the Select's value: a courier id as a string, or '' when none is chosen.
export const dispatchOrderSchema = z
  .object({
    method: z.enum(['courier', 'pickup']),
    courierId: z.string(),
    trackingNumber: z
      .string()
      .trim()
      .max(TRACKING_NUMBER_MAXIMUM_LENGTH, 'Keep the tracking number to 100 characters or fewer'),
  })
  .superRefine((values, context) => {
    if (values.method === 'courier' && values.courierId === '') {
      context.addIssue({ code: 'custom', path: ['courierId'], message: 'Choose a courier' });
    }
  });

export type DispatchOrderInput = z.infer<typeof dispatchOrderSchema>;
