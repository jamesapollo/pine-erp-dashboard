import { formatSaveIssues } from '@/utils/saveIssues';

describe('formatSaveIssues', () => {
  it('names every step that did not save', () => {
    expect(
      formatSaveIssues({ variants: 2, stock: 1, images: 1, publish: false, message: 'X' }),
    ).toBe(
      "Saved as a draft, but 2 variants, opening stock for 1 variant and 1 image didn't save: X. Add them below.",
    );
  });

  it('uses the singular for one variant', () => {
    expect(
      formatSaveIssues({
        variants: 1,
        stock: 0,
        images: 0,
        publish: false,
        message: 'A variant with these options already exists.',
      }),
    ).toBe(
      "Saved as a draft, but 1 variant didn't save: A variant with these options already exists. Add them below.",
    );
  });

  it('says when only publishing failed', () => {
    expect(
      formatSaveIssues({ variants: 0, stock: 0, images: 0, publish: true, message: 'X' }),
    ).toBe("Saved as a draft, but it couldn't be published: X.");
  });

  it('mentions publishing when other steps failed too', () => {
    expect(
      formatSaveIssues({ variants: 0, stock: 0, images: 3, publish: true, message: 'X' }),
    ).toBe("Saved as a draft, but 3 images didn't save: X. Add them below, then publish.");
  });
});
