import { type ReactNode } from 'react';

export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-surface-card md:grid-cols-2">
      <main className="flex flex-col justify-center px-6 py-12 md:px-[10%]">
        <div className="mb-12 text-lg font-semibold leading-none tracking-[-0.01em]">Pine ERP</div>
        <div className="flex max-w-[380px] flex-col gap-4">
          <div>
            <h1 className="m-0 text-[28px] font-semibold leading-[1.15] tracking-[-0.02em]">
              {title}
            </h1>
            <p className="mt-1.5 text-text-secondary">{description}</p>
          </div>
          {children}
        </div>
      </main>
      <aside className="hidden flex-col justify-end bg-brand-800 p-12 text-brand-100 md:flex">
        <p className="m-0 max-w-[420px] text-[22px] font-medium leading-[1.4] tracking-[-0.01em] text-white">
          Orders, stock and deliveries for your shop — in one calm place.
        </p>
        <p className="mt-4 text-[13px] leading-[1.45] text-brand-200">Zion · zionankara.com</p>
      </aside>
    </div>
  );
}
