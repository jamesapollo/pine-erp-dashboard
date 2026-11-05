import { type Offer, type OfferStatus } from '@/types/pricing';
import { formatMoney } from '@/utils/money';

const DAY_MILLISECONDS = 86_400_000;
// Sale prices are in the store's currency; every store sells in shillings.
const OFFER_CURRENCY = 'KES';

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

type OfferSchedule = Pick<Offer, 'is_active' | 'starts_at' | 'ends_at'>;

/** The same rule as the API: paused wins, then before the start, from the end, else live. */
export function getOfferStatus(offer: OfferSchedule, now: Date = new Date()): OfferStatus {
  if (!offer.is_active) return 'inactive';
  if (now < new Date(offer.starts_at)) return 'scheduled';
  if (now >= new Date(offer.ends_at)) return 'ended';
  return 'live';
}

/** "21 Oct". */
export function formatOfferDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MILLISECONDS);
}

function pluraliseDays(days: number): string {
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** "Ends in 4 days", "Starts in 1 day", "Ended 2 Oct" or "Paused". */
export function describeOfferTiming(offer: OfferSchedule, now: Date = new Date()): string {
  const status = getOfferStatus(offer, now);
  if (status === 'live') {
    const days = daysBetween(now, new Date(offer.ends_at));
    return days <= 0 ? 'Ends today' : `Ends in ${pluraliseDays(days)}`;
  }
  if (status === 'scheduled') {
    return `Starts in ${pluraliseDays(Math.max(1, daysBetween(now, new Date(offer.starts_at))))}`;
  }
  if (status === 'ended') return `Ended ${formatOfferDate(offer.ends_at)}`;
  return 'Paused';
}

/** "15% off" or "KES 3,990.00". */
export function formatOfferDiscount(offer: Pick<Offer, 'type' | 'value'>): string {
  if (offer.type === 'percent_off') return `${Number(offer.value)}% off`;
  return formatMoney({ amount: offer.value, currency: OFFER_CURRENCY });
}

/** The first two targets by name and a count of the rest: "Dresses, Shirts +1". */
export function summariseOfferTargets(
  offer: Pick<Offer, 'categories' | 'products' | 'variants'>,
): string {
  const names = [
    ...offer.categories.map((category) => category.name),
    ...offer.products.map((product) => product.title),
  ];
  const variantCount = offer.variants.length;
  if (variantCount) names.push(`${variantCount} ${variantCount === 1 ? 'variant' : 'variants'}`);
  const shown = names.slice(0, 2).join(', ');
  return names.length > 2 ? `${shown} +${names.length - 2}` : shown;
}

function padTwo(value: number): string {
  return String(value).padStart(2, '0');
}

/** An ISO instant as a datetime-local value ("2026-10-22T09:30") in the browser's time zone. */
export function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}T${padTwo(
    date.getHours(),
  )}:${padTwo(date.getMinutes())}`;
}

/**
 * A datetime-local value as an ISO instant. The offset is sent so the API never rereads the time in
 * the store's own time zone.
 */
export function fromDateTimeLocal(value: string): string {
  return new Date(value).toISOString();
}
