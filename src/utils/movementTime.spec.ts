import { formatMovementTime } from '@/utils/movementTime';

const now = new Date('2026-10-18T12:00:00Z');

describe('formatMovementTime', () => {
  it('says Just now under a minute', () => {
    expect(formatMovementTime('2026-10-18T11:59:30Z', now)).toBe('Just now');
  });

  it('counts minutes under an hour', () => {
    expect(formatMovementTime('2026-10-18T11:48:00Z', now)).toBe('12 min ago');
    expect(formatMovementTime('2026-10-18T11:00:01Z', now)).toBe('59 min ago');
  });

  it('shows the date and time from an hour on', () => {
    const createdAt = '2026-10-18T11:00:00Z';
    expect(formatMovementTime(createdAt, now)).toBe(
      new Intl.DateTimeFormat('en-KE', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(createdAt)),
    );
  });

  it('treats a time slightly in the future as Just now', () => {
    expect(formatMovementTime('2026-10-18T12:00:20Z', now)).toBe('Just now');
  });
});
