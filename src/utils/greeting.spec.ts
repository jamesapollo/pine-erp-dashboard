import { getGreeting } from '@/utils/greeting';

describe('getGreeting', () => {
  it('greets by the part of the day with the first name', () => {
    expect(getGreeting('Wanjiru Kamau', new Date(2026, 10, 5, 8, 0))).toBe('Good morning, Wanjiru');
    expect(getGreeting('Wanjiru Kamau', new Date(2026, 10, 5, 12, 0))).toBe(
      'Good afternoon, Wanjiru',
    );
    expect(getGreeting('  Otieno ', new Date(2026, 10, 5, 17, 0))).toBe('Good evening, Otieno');
  });

  it('greets without a name when there is none', () => {
    expect(getGreeting('', new Date(2026, 10, 5, 9, 0))).toBe('Good morning');
  });
});
