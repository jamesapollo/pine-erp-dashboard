import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

import { type Role, type StaffMember } from '@/types/staff';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Icon } from '@/components/ui/Icon';
import { countVisiblePermissions } from '@/utils/rolePermissions';
import { cn } from '@/utils/cn';
import { PERMISSION_GROUPS } from '@/constants/permissions';
import { buildRolePath } from '@/constants/routes';

const MAX_AVATARS = 4;
const visiblePermissionTotal = PERMISSION_GROUPS.flatMap((group) => group.slugs).length;

function RoleMembers({ role, members }: { role: Role; members: StaffMember[] }) {
  if (role.member_count === 0) return <span className="text-text-tertiary">None</span>;

  const shownMembers = members.slice(0, MAX_AVATARS);
  const hiddenCount = role.member_count - shownMembers.length;

  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex">
        {shownMembers.map((member, index) => (
          <span
            key={member.id}
            className={cn('rounded-full shadow-[0_0_0_2px_var(--surface-card)]', index && '-ml-2')}
          >
            <Avatar name={member.name} size={24} />
          </span>
        ))}
      </span>
      <span className="text-text-secondary">
        {role.member_count > MAX_AVATARS && hiddenCount > 0 ? `+${hiddenCount}` : role.member_count}
      </span>
    </span>
  );
}

// The roles list carries only a member count, so the avatars come from the staff list.
export function RolesTable({ roles, members }: { roles: Role[]; members: StaffMember[] }) {
  const navigate = useNavigate();

  return (
    <DataTable
      caption="Roles"
      rows={roles}
      getRowKey={(role) => role.id}
      onRowClick={(role) => navigate(buildRolePath(role.id))}
      empty="No roles yet."
      columns={[
        {
          key: 'name',
          header: 'Role',
          render: (role) => (
            <div>
              <div className="flex items-center gap-2 font-medium">
                <Link
                  to={buildRolePath(role.id)}
                  // The row navigates on click as well; stop the click reaching it twice.
                  onClick={(event) => event.stopPropagation()}
                  className="text-text-primary no-underline hover:underline focus-visible:rounded-chip focus-visible:shadow-focus focus-visible:outline-none"
                >
                  {role.name}
                </Link>
                {role.is_system ? <Badge tone="neutral">Built-in</Badge> : null}
              </div>
              {role.description ? (
                <div className="text-xs text-text-tertiary">{role.description}</div>
              ) : null}
            </div>
          ),
        },
        {
          key: 'permissions',
          header: 'Permissions',
          render: (role) => (
            <span className="text-text-secondary">
              {role.slug === 'owner'
                ? 'All'
                : `${countVisiblePermissions(role.permissions)} of ${visiblePermissionTotal}`}
            </span>
          ),
        },
        {
          key: 'members',
          header: 'Members',
          render: (role) => (
            <RoleMembers
              role={role}
              members={members.filter((member) => member.role?.id === role.id)}
            />
          ),
        },
        {
          key: 'open',
          header: '',
          width: 48,
          render: () => <Icon icon={ChevronRight} className="text-text-tertiary" />,
        },
      ]}
    />
  );
}
