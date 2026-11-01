import { IMAGE_REJECTED_MESSAGE, validateImageFile } from '@/utils/imageFiles';

describe('validateImageFile', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', (type) => {
    expect(validateImageFile(new File(['x'], 'photo', { type }))).toBeUndefined();
  });

  it('rejects other types', () => {
    expect(validateImageFile(new File(['x'], 'spin.gif', { type: 'image/gif' }))).toBe(
      IMAGE_REJECTED_MESSAGE,
    );
  });

  it('accepts exactly 5 MB and rejects anything larger', () => {
    const limit = 5 * 1024 * 1024;
    const atLimit = new File([new Uint8Array(limit)], 'a.jpg', { type: 'image/jpeg' });
    const overLimit = new File([new Uint8Array(limit + 1)], 'b.jpg', { type: 'image/jpeg' });
    expect(validateImageFile(atLimit)).toBeUndefined();
    expect(validateImageFile(overLimit)).toBe('Use a JPG, PNG or WebP image up to 5 MB.');
  });
});
