import {
  describeOfferTiming,
  formatOfferDate,
  formatOfferDiscount,
  fromDateTimeLocal,
  getOfferStatus,
  summariseOfferTargets,
  toDateTimeLocal,
} from '@/utils/offers';

const now = new Date('2026-10-21T12:00:00');
const run = {
  starts_at: new Date('2026-10-20T00:00:00').toISOString(),
  ends_at: new Date('2026-10-25T00:00:00').toISOString(),
};

describe('getOfferStatus', () => {
  it('is inactive when paused, whatever the dates', () => {
    expect(getOfferStatus({ ...run, is_active: false }, now)).toBe('inactive');
  });

  it('is scheduled before the start, live inside the run and ended from the end', () => {
    expect(
      getOfferStatus(
        { is_active: true, starts_at: '2026-10-22T00:00:00Z', ends_at: '2026-10-29T00:00:00Z' },
        new Date('2026-10-21T00:00:00Z'),
      ),
    ).toBe('scheduled');
    expect(getOfferStatus({ ...run, is_active: true }, now)).toBe('live');
    expect(getOfferStatus({ ...run, is_active: true }, new Date(run.ends_at))).toBe('ended');
  });
});

describe('describeOfferTiming', () => {
  it('counts the days left on a live offer', () => {
    expect(describeOfferTiming({ ...run, is_active: true }, now)).toBe('Ends in 4 days');
    expect(
      describeOfferTiming(
        { ...run, is_active: true, ends_at: new Date('2026-10-22T12:00:00').toISOString() },
        now,
      ),
    ).toBe('Ends in 1 day');
    expect(
      describeOfferTiming(
        { ...run, is_active: true, ends_at: new Date('2026-10-21T18:00:00').toISOString() },
        now,
      ),
    ).toBe('Ends today');
  });

  it('counts the days to a scheduled start, at least one', () => {
    expect(
      describeOfferTiming(
        {
          is_active: true,
          starts_at: new Date('2026-10-24T12:00:00').toISOString(),
          ends_at: new Date('2026-10-30T00:00:00').toISOString(),
        },
        now,
      ),
    ).toBe('Starts in 3 days');
    expect(
      describeOfferTiming(
        {
          is_active: true,
          starts_at: new Date('2026-10-21T15:00:00').toISOString(),
          ends_at: new Date('2026-10-30T00:00:00').toISOString(),
        },
        now,
      ),
    ).toBe('Starts in 1 day');
  });

  it('gives the end date of an ended offer and says a paused one is paused', () => {
    expect(
      describeOfferTiming(
        { ...run, is_active: true, ends_at: new Date('2026-10-02T00:00:00').toISOString() },
        now,
      ),
    ).toBe(`Ended ${formatOfferDate(new Date('2026-10-02T00:00:00').toISOString())}`);
    expect(describeOfferTiming({ ...run, is_active: false }, now)).toBe('Paused');
  });
});

describe('formatOfferDiscount', () => {
  it('shows a percentage without trailing zeros and a sale price as money', () => {
    expect(formatOfferDiscount({ type: 'percent_off', value: '15.00' })).toBe('15% off');
    expect(formatOfferDiscount({ type: 'percent_off', value: '12.50' })).toBe('12.5% off');
    expect(formatOfferDiscount({ type: 'sale_price', value: '3990.00' })).toBe('KES 3,990.00');
  });
});

describe('summariseOfferTargets', () => {
  it('lists the first two targets and counts the rest', () => {
    expect(
      summariseOfferTargets({
        categories: [
          { id: 1, name: 'Dresses' },
          { id: 2, name: 'Shirts' },
        ],
        products: [{ id: 3, title: 'Kitenge shirt' }],
        variants: [],
      }),
    ).toBe('Dresses, Shirts +1');
  });

  it('counts variants chosen elsewhere', () => {
    expect(
      summariseOfferTargets({
        categories: [],
        products: [],
        variants: [{ id: 1, sku: 'DRS-S', product_id: 1 }],
      }),
    ).toBe('1 variant');
  });
});

describe('datetime-local conversion', () => {
  it('round-trips a local time through an ISO instant', () => {
    const iso = fromDateTimeLocal('2026-10-22T09:30');
    expect(iso).toBe(new Date('2026-10-22T09:30').toISOString());
    expect(toDateTimeLocal(iso)).toBe('2026-10-22T09:30');
  });
});
