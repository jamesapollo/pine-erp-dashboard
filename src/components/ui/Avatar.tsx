const TINTS = [
  'bg-brand-100 text-brand-800',
  'bg-clay-100 text-clay-700',
  'bg-info-100 text-info-700',
  'bg-warning-100 text-warning-700',
  'bg-success-100 text-success-700',
  'bg-neutral-200 text-neutral-800',
] as const;

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

function getTint(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return TINTS[hash % TINTS.length] ?? TINTS[0];
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      title={name}
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold leading-none ${getTint(name)}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {getInitials(name)}
    </span>
  );
}
