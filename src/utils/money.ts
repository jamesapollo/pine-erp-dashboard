import { type Money } from '@/types/catalogue';

const MAXIMUM_PRICE = 9_999_999_999.99;
const MINIMUM_PRICE = 0.01;

const amountFormatter = new Intl.NumberFormat('en-KE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatAmount(money: Money | null, fallback = '—'): string {
  if (!money) return fallback;
  return amountFormatter.format(Number(money.amount));
}

export function formatMoney(money: Money | null, fallback = '—'): string {
  if (!money) return fallback;
  return `${money.currency} ${formatAmount(money)}`;
}

function stripCommas(value: string): string {
  return value.replaceAll(',', '').trim();
}

export function toMoneyInput(value: string): string {
  return Number(stripCommas(value)).toFixed(2);
}

export function isValidPrice(value: string): boolean {
  const cleaned = stripCommas(value);
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return false;
  const amount = Number(cleaned);
  return amount >= MINIMUM_PRICE && amount <= MAXIMUM_PRICE;
}
