import { type ReactNode } from 'react';

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="text-right tabular-nums">{value}</span>
    </div>
  );
}
