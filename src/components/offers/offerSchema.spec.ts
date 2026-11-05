import { buildOfferSchema, type OfferInput } from '@/components/offers/offerSchema';

const valid: OfferInput = {
  name: 'Mashujaa Day sale',
  type: 'percent_off',
  value: '15',
  startsAt: '2026-10-22T00:00',
  endsAt: '2026-10-29T00:00',
  isActive: true,
  categoryIds: [1],
  productIds: [],
};

function messagesFor(input: Partial<OfferInput>, variantCount = 0) {
  const result = buildOfferSchema(variantCount).safeParse({ ...valid, ...input });
  return Object.fromEntries(
    (result.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]),
  );
}

describe('offer schema', () => {
  it('accepts a complete offer', () => {
    expect(buildOfferSchema(0).safeParse(valid).success).toBe(true);
  });

  it('reports every problem at once', () => {
    expect(Object.keys(messagesFor({ name: '', value: '', endsAt: '', categoryIds: [] }))).toEqual([
      'name',
      'value',
      'endsAt',
      'categoryIds',
    ]);
  });

  it('asks for a name of at most 120 characters', () => {
    expect(messagesFor({ name: '  ' }).name).toBe('Name the offer.');
    expect(messagesFor({ name: 'a'.repeat(121) }).name).toBe('Keep the name to 120 characters.');
  });

  it('keeps a percentage above 0 and below 100', () => {
    expect(messagesFor({ value: '0' }).value).toBe('Enter a percentage between 0 and 100.');
    expect(messagesFor({ value: '100' }).value).toBe('Enter a percentage between 0 and 100.');
    expect(messagesFor({ value: '12.345' }).value).toBe('Enter a percentage between 0 and 100.');
    expect(messagesFor({ value: '12.5' }).value).toBeUndefined();
  });

  it('asks for a valid sale price', () => {
    expect(messagesFor({ type: 'sale_price', value: 'abc' }).value).toBe('Enter a valid price.');
    expect(messagesFor({ type: 'sale_price', value: '3,990' }).value).toBeUndefined();
  });

  it('needs both dates and an end after the start', () => {
    expect(messagesFor({ startsAt: '' }).startsAt).toBe('Choose when the offer starts.');
    expect(messagesFor({ endsAt: '' }).endsAt).toBe('Choose when the offer ends.');
    expect(messagesFor({ endsAt: '2026-10-22T00:00' }).endsAt).toBe('Must be after the start.');
  });

  it('needs at least one category, product or existing variant', () => {
    expect(messagesFor({ categoryIds: [] }).categoryIds).toBe(
      'Pick at least one category or product.',
    );
    expect(messagesFor({ categoryIds: [] }, 1).categoryIds).toBeUndefined();
  });
});
