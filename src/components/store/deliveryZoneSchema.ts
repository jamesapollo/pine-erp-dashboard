import { z } from 'zod';

export const MAX_ZONE_FEE = 1_000_000;

export type DeliveryZoneInput = { name: string; fee: string; isActive: boolean };

/** A fee of 0 is free delivery or pickup, so it reads "Free". */
export function isFreeFee(amount: string): boolean {
  return Number(amount) === 0;
}

export function buildDeliveryZoneSchema({
  countryName,
  otherZoneNames,
}: {
  countryName: string;
  /** The country's other zones, to catch a duplicate before the API does. */
  otherZoneNames: string[];
}) {
  const takenNames = new Set(otherZoneNames.map((name) => name.trim().toLowerCase()));
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Name the zone.')
      .max(120, 'Keep the name under 120 characters.')
      .refine((name) => !takenNames.has(name.toLowerCase()), {
        message: `A zone with this name already exists for ${countryName}.`,
      }),
    fee: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/, 'Enter a fee — 0 for free.')
      // Only a well-formed fee gets this message; anything else already has the one above.
      .refine((fee) => !/^\d/.test(fee) || Number(fee) <= MAX_ZONE_FEE, 'Enter at most 1,000,000.'),
    isActive: z.boolean(),
  });
}
