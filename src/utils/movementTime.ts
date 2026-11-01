const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const dateTimeFormatter = new Intl.DateTimeFormat('en-KE', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** "Just now" or "12 min ago" within the last hour, otherwise the local date and time. */
export function formatMovementTime(createdAt: string, now: Date = new Date()): string {
  const created = new Date(createdAt);
  const elapsed = now.getTime() - created.getTime();
  if (elapsed >= HOUR) return dateTimeFormatter.format(created);
  const minutes = Math.floor(elapsed / MINUTE);
  return minutes < 1 ? 'Just now' : `${minutes} min ago`;
}
