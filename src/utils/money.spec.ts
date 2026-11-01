import { buildMoney } from '@/tests/fixtures/catalogue';
import { formatAmount, formatMoney, isValidPrice, toMoneyInput } from '@/utils/money';

describe('formatMoney', () => {
  it('formats with the currency code and two decimals', () => {
    expect(formatMoney(buildMoney('4500'))).toBe('KES 4,500.00');
  });

  it('returns the fallback for null', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(null, 'No price')).toBe('No price');
  });
});

describe('formatAmount', () => {
  it('formats the amount without the currency code', () => {
    expect(formatAmount(buildMoney('1234567.5'))).toBe('1,234,567.50');
  });

  it('returns the fallback for null', () => {
    expect(formatAmount(null)).toBe('—');
  });
});

describe('toMoneyInput', () => {
  it('normalises user input to a two-decimal string without commas', () => {
    expect(toMoneyInput('4500')).toBe('4500.00');
    expect(toMoneyInput('4,500.5')).toBe('4500.50');
  });
});

describe('isValidPrice', () => {
  it('accepts prices from 0.01 with at most two decimals', () => {
    expect(isValidPrice('0.01')).toBe(true);
    expect(isValidPrice('4,500.5')).toBe(true);
    expect(isValidPrice('9999999999.99')).toBe(true);
  });

  it('rejects zero, too many decimals, non-numbers and values above the maximum', () => {
    expect(isValidPrice('0')).toBe(false);
    expect(isValidPrice('1.234')).toBe(false);
    expect(isValidPrice('abc')).toBe(false);
    expect(isValidPrice('')).toBe(false);
    expect(isValidPrice('10000000000')).toBe(false);
  });
});
