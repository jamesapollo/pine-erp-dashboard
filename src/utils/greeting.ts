/** "Good morning, Wanjiru" by the browser's local hour, with the first word of the person's name. */
export function getGreeting(name: string, now: Date = new Date()): string {
  const hour = now.getHours();
  const partOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const firstName = name.trim().split(/\s+/)[0];
  return firstName ? `Good ${partOfDay}, ${firstName}` : `Good ${partOfDay}`;
}
