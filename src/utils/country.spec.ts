import { formatCountry } from '@/utils/country';

describe('formatCountry', () => {
  it('spells out a known region code', () => {
    expect(formatCountry('KE')).toBe('Kenya');
  });

  it('falls back to the code when it is unknown', () => {
    expect(formatCountry('ZZ')).toBe('ZZ');
  });
});
