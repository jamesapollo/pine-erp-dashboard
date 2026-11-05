import { getAvailableRange, getStockStatus } from '@/utils/stockStatus';

describe('getStockStatus', () => {
  it('is out at zero or below, low up to three, in stock above', () => {
    expect(getStockStatus(-2)).toBe('out');
    expect(getStockStatus(0)).toBe('out');
    expect(getStockStatus(1)).toBe('low');
    expect(getStockStatus(3)).toBe('low');
    expect(getStockStatus(4)).toBe('in_stock');
  });
});

describe('getAvailableRange', () => {
  it('asks for the same ranges the badges use', () => {
    expect(getAvailableRange('out')).toEqual({ available_max: 0 });
    expect(getAvailableRange('low')).toEqual({ available_min: 1, available_max: 3 });
    expect(getAvailableRange('low_or_out')).toEqual({ available_max: 3 });
  });
});
