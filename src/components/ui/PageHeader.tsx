import { type ReactNode } from 'react';

export function PageHeader({
  title,
  sub,
  actions,
  back,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-0">
        {back}
        <h1 className="m-0 text-[length:var(--text-2xl)] font-semibold leading-[1.15] tracking-[-0.02em] text-text-primary">
          {title}
        </h1>
        {sub ? (
          <p className="m-0 mt-1.5 text-[length:var(--text-base)] leading-normal text-text-secondary">
            {sub}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}
