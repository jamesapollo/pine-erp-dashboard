import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  ShoppingBag,
  Truck,
  type LucideIcon,
} from 'lucide-react';

import { type StoreSummary, type User } from '@/types/session';
import { usePendingOrderCountQuery } from '@/hooks/api/queries/sales/usePendingOrderCountQuery';
import { useSignOut } from '@/hooks/useSignOut';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { SignOutError } from '@/components/ui/SignOutError';
import { cn } from '@/utils/cn';
import { ROUTES } from '@/constants/routes';

export function Sidebar({
  store,
  user,
  roles,
  permissions,
}: {
  store: StoreSummary;
  user: User;
  roles: string[];
  permissions: string[];
}) {
  const { signOut, isSigningOut, hasFailed } = useSignOut();
  const canViewOrders = permissions.includes('orders.view');
  const pendingOrderCount = usePendingOrderCountQuery({ enabled: canViewOrders });
  const [primaryRole = ''] = roles;
  const roleLabel = primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1);

  return (
    <aside className="sticky top-0 flex h-screen w-sidebar shrink-0 flex-col border-r border-border-default bg-surface-sidebar">
      <div className="flex h-topbar items-center gap-2.5 border-b border-border-subtle px-3.5">
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-[7px] bg-brand-600 text-[13px] font-bold leading-none text-white"
        >
          {store.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight">
          {store.name}
        </div>
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 overflow-auto px-2.5 py-3">
        <SidebarLink to={ROUTES.ROOT} icon={LayoutDashboard} label="Overview" isEnd />
        {canViewOrders ? (
          <SidebarGroup label="Sales">
            <SidebarLink
              to={ROUTES.ORDERS}
              icon={ShoppingBag}
              label="Orders"
              count={pendingOrderCount}
              countLabel={`${pendingOrderCount} pending`}
            />
            <SidebarLink to={ROUTES.DELIVERIES} icon={Truck} label="Deliveries" />
          </SidebarGroup>
        ) : null}
        {permissions.includes('catalogue.view') ? (
          <SidebarGroup label="Catalogue">
            <SidebarLink to={ROUTES.PRODUCTS} icon={Package} label="Products" />
          </SidebarGroup>
        ) : null}
        {permissions.includes('inventory.view') ? (
          <SidebarGroup label="Inventory">
            <SidebarLink to={ROUTES.STOCK} icon={Boxes} label="Stock" />
          </SidebarGroup>
        ) : null}
        {canViewOrders ? (
          <SidebarGroup label="Store">
            <SidebarLink to={ROUTES.DELIVERY_ZONES} icon={MapPin} label="Delivery zones" />
          </SidebarGroup>
        ) : null}
      </nav>
      {hasFailed ? (
        <div className="px-3 pb-2">
          <SignOutError />
        </div>
      ) : null}
      <div className="flex items-center gap-2.5 border-t border-border-subtle p-3">
        <Avatar name={user.name} size={32} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium leading-tight">{user.name}</div>
          <div className="text-xs leading-tight text-text-tertiary">{roleLabel}</div>
        </div>
        <IconButton
          icon={LogOut}
          label="Sign out"
          size="sm"
          disabled={isSigningOut}
          onClick={() => void signOut()}
        />
      </div>
    </aside>
  );
}

function SidebarGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-4 flex flex-col gap-0.5">
      <div className="px-2.5 pb-1.5 text-[length:var(--text-2xs)] font-semibold uppercase tracking-[var(--tracking-caps)] text-text-tertiary">
        {label}
      </div>
      {children}
    </div>
  );
}

function SidebarLink({
  to,
  icon,
  label,
  isEnd = false,
  count,
  countLabel,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  isEnd?: boolean;
  count?: number;
  countLabel?: string;
}) {
  const hasCount = count !== undefined && count > 0;

  return (
    <NavLink
      to={to}
      end={isEnd}
      className={({ isActive }) =>
        cn(
          'flex h-[34px] w-full items-center gap-2.5 rounded-control px-2.5 text-left text-sm font-medium leading-none',
          isActive
            ? 'bg-surface-card text-text-primary shadow-[var(--shadow-sm),0_0_0_1px_var(--border-default)]'
            : 'text-text-secondary hover:bg-neutral-100',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon icon={icon} size={18} className={isActive ? 'text-brand-600' : undefined} />
          <span className="flex-1">{label}</span>
          {hasCount ? (
            <>
              <span
                aria-hidden
                className="inline-flex h-[18px] min-w-5 items-center justify-center rounded-full bg-neutral-100 px-1.5 text-[length:var(--text-2xs)] font-medium leading-none tabular-nums text-text-secondary"
              >
                {count}
              </span>
              <span className="sr-only">, {countLabel ?? count}</span>
            </>
          ) : null}
        </>
      )}
    </NavLink>
  );
}
