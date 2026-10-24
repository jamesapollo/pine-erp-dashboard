import { Link } from 'react-router-dom';

export function TextLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="text-[13px] font-medium leading-none text-text-link no-underline hover:underline"
    >
      {children}
    </Link>
  );
}
