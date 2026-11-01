import { buildDeliveryZoneSchema, isFreeFee } from '@/components/store/deliveryZoneSchema';

const schema = buildDeliveryZoneSchema({ countryName: 'Kenya', otherZoneNames: ['Nairobi CBD'] });

function issues(input: { name: string; fee: string; isActive?: boolean }) {
  const result = schema.safeParse({ isActive: true, ...input });
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
}

describe('buildDeliveryZoneSchema', () => {
  it('accepts a named zone with a fee, including a free one', () => {
    expect(issues({ name: 'Mombasa', fee: '350' })).toEqual({});
    expect(issues({ name: 'Pickup', fee: '0' })).toEqual({});
    expect(issues({ name: 'Kisumu', fee: '199.50' })).toEqual({});
  });

  it('needs a name that no other zone in the country has', () => {
    expect(issues({ name: '  ', fee: '1' })).toEqual({ name: 'Name the zone.' });
    expect(issues({ name: 'nairobi cbd ', fee: '1' })).toEqual({
      name: 'A zone with this name already exists for Kenya.',
    });
  });

  it('needs a fee of at most two decimals and a million', () => {
    for (const fee of ['', 'abc', '1.234', '-5']) {
      expect(issues({ name: 'Nakuru', fee })).toEqual({ fee: 'Enter a fee — 0 for free.' });
    }
    expect(issues({ name: 'Nakuru', fee: '1000001' })).toEqual({
      fee: 'Enter at most 1,000,000.',
    });
  });
});

describe('isFreeFee', () => {
  it('is free only at zero', () => {
    expect(isFreeFee('0.00')).toBe(true);
    expect(isFreeFee('0.01')).toBe(false);
  });
});
