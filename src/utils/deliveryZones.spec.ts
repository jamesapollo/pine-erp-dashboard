import { buildDeliveryZoneFixture } from '@/tests/fixtures/sales';
import { formatZoneFee, getZoneCountries } from '@/utils/deliveryZones';

describe('formatZoneFee', () => {
  it('says Free for a zero fee', () => {
    expect(formatZoneFee({ amount: '0.00', currency: 'KES' })).toBe('Free');
    expect(formatZoneFee({ amount: '350.00', currency: 'KES' })).toBe('KES 350.00');
  });
});

describe('getZoneCountries', () => {
  it('lists each country once, in order', () => {
    expect(
      getZoneCountries([
        buildDeliveryZoneFixture({ id: 1, country: 'KE' }),
        buildDeliveryZoneFixture({ id: 2, country: 'KE' }),
        buildDeliveryZoneFixture({ id: 3, country: 'UG' }),
      ]),
    ).toEqual(['KE', 'UG']);
  });
});
