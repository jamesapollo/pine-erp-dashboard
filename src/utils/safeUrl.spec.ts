import { toSafeExternalUrl } from '@/utils/safeUrl';

describe('toSafeExternalUrl', () => {
  it('keeps https and http links', () => {
    expect(toSafeExternalUrl('https://track.swiftriders.test/KE88213')).toBe(
      'https://track.swiftriders.test/KE88213',
    );
    expect(toSafeExternalUrl('http://track.example.test/1')).toBe('http://track.example.test/1');
  });

  it('rejects other protocols', () => {
    expect(toSafeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(toSafeExternalUrl('data:text/html,<p>hi</p>')).toBeNull();
  });

  it('rejects garbage and null', () => {
    expect(toSafeExternalUrl('not a url')).toBeNull();
    expect(toSafeExternalUrl('')).toBeNull();
    expect(toSafeExternalUrl(null)).toBeNull();
  });
});
