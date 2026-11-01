import { type Money } from '@/types/catalogue';
import { type DeliveryZone } from '@/types/sales';
import { formatMoney } from '@/utils/money';

/** "Free" for a zero fee, otherwise the money, such as "KES 350.00". */
export function formatZoneFee(fee: Money): string {
  return Number(fee.amount) === 0 ? 'Free' : formatMoney(fee);
}

/** The countries that have zones, in the order the API returns them (by country code). */
export function getZoneCountries(zones: DeliveryZone[]): string[] {
  return [...new Set(zones.map((zone) => zone.country))];
}
