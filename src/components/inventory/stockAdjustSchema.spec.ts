import {
  buildStockAdjustSchema,
  getOnHandAfter,
  toStockAdjustmentBody,
  type StockAdjustInput,
} from '@/components/inventory/stockAdjustSchema';

function issues(onHand: number, input: StockAdjustInput) {
  const result = buildStockAdjustSchema(onHand).safeParse(input);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
}

describe('buildStockAdjustSchema', () => {
  it('accepts a receipt without a reason', () => {
    expect(issues(5, { mode: 'receipt', quantity: '3', reason: '' })).toEqual({});
  });

  it('needs a reason to remove stock or set a count', () => {
    expect(issues(5, { mode: 'remove', quantity: '1', reason: ' ' })).toEqual({
      reason: 'Say why — it’s kept on the record.',
    });
    expect(issues(5, { mode: 'count', quantity: '2', reason: '' })).toHaveProperty('reason');
  });

  it('needs a positive whole number to receive or remove', () => {
    for (const quantity of ['', '0', '1.5', '-2', 'abc']) {
      expect(issues(5, { mode: 'receipt', quantity, reason: '' })).toEqual({
        quantity: 'Enter a whole number.',
      });
    }
  });

  it('allows a count of zero but not the current on hand', () => {
    expect(issues(5, { mode: 'count', quantity: '0', reason: 'Stock take' })).toEqual({});
    expect(issues(5, { mode: 'count', quantity: '5', reason: 'Stock take' })).toEqual({
      quantity: 'Same as on hand — nothing to change.',
    });
  });

  it('keeps stock between zero and a million', () => {
    expect(issues(5, { mode: 'remove', quantity: '6', reason: 'Lost' })).toEqual({
      quantity: 'Only 5 on hand.',
    });
    expect(issues(999_999, { mode: 'receipt', quantity: '2', reason: '' })).toEqual({
      quantity: 'Stock can’t go above 1,000,000.',
    });
    expect(issues(0, { mode: 'receipt', quantity: '100001', reason: '' })).toEqual({
      quantity: 'Enter at most 100,000 units at a time.',
    });
  });
});

describe('getOnHandAfter', () => {
  it('adds, removes or replaces', () => {
    expect(getOnHandAfter(5, 'receipt', '3')).toBe(8);
    expect(getOnHandAfter(5, 'remove', '3')).toBe(2);
    expect(getOnHandAfter(5, 'count', '9')).toBe(9);
    expect(getOnHandAfter(5, 'count', 'x')).toBeUndefined();
  });
});

describe('toStockAdjustmentBody', () => {
  it('sends a receipt, a negative adjustment or a count', () => {
    expect(toStockAdjustmentBody(7, { mode: 'receipt', quantity: '4', reason: '' })).toEqual({
      variant_id: 7,
      type: 'receipt',
      change: 4,
      reason: 'Stock received',
    });
    expect(toStockAdjustmentBody(7, { mode: 'remove', quantity: '2', reason: ' Torn ' })).toEqual({
      variant_id: 7,
      type: 'adjustment',
      change: -2,
      reason: 'Torn',
    });
    expect(toStockAdjustmentBody(7, { mode: 'count', quantity: '0', reason: 'Count' })).toEqual({
      variant_id: 7,
      type: 'adjustment',
      set_to: 0,
      reason: 'Count',
    });
  });
});
