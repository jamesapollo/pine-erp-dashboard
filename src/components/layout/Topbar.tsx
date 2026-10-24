export function Topbar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-topbar items-center gap-4 border-b border-border-default bg-white/85 px-8 backdrop-blur-[8px]">
      <nav
        aria-label="Breadcrumb"
        className="min-w-0 flex-1 text-[13px] font-medium leading-none text-text-primary"
      >
        {title}
      </nav>
    </header>
  );
}
