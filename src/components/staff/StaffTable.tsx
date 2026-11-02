import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

import { type StaffMember } from '@/types/staff';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatMovementTime } from '@/utils/movementTime';
import { buildStaffMemberPath } from '@/constants/routes';

const dateFormatter = new Intl.DateTimeFormat('en-KE', { month: 'short', day: 'numeric' });

function formatLastActive(member: StaffMember): string {
  if (member.status === 'invited' && member.invitation) {
    return `Invited · expires ${dateFormatter.format(new Date(member.invitation.expires_at))}`;
  }
  return member.last_active_at ? formatMovementTime(member.last_active_at) : 'Never';
}

export function StaffTable({ members }: { members: StaffMember[] }) {
  const navigate = useNavigate();

  return (
    <DataTable
      caption="Staff"
      rows={members}
      getRowKey={(member) => member.id}
      onRowClick={(member) => navigate(buildStaffMemberPath(member.id))}
      empty="No one on the team yet."
      columns={[
        {
          key: 'name',
          header: 'Name',
          render: (member) => (
            <span className="inline-flex items-center gap-2.5">
              <Avatar name={member.name} />
              <Link
                to={buildStaffMemberPath(member.id)}
                // The row navigates on click as well; stop the click reaching it twice.
                onClick={(event) => event.stopPropagation()}
                className="font-medium text-text-primary no-underline hover:underline focus-visible:rounded-chip focus-visible:shadow-focus focus-visible:outline-none"
              >
                {member.name}
              </Link>
            </span>
          ),
        },
        {
          key: 'email',
          header: 'Email',
          render: (member) => <span className="text-text-secondary">{member.email}</span>,
        },
        {
          key: 'role',
          header: 'Role',
          render: (member) =>
            member.role ? (
              <Badge tone={member.role.is_system ? 'primary' : 'neutral'}>{member.role.name}</Badge>
            ) : (
              <span className="text-text-disabled">—</span>
            ),
        },
        {
          key: 'status',
          header: 'Status',
          render: (member) => (
            <StatusBadge
              kind="membership"
              status={member.status === 'suspended' ? 'deactivated' : member.status}
            />
          ),
        },
        {
          key: 'last_active_at',
          header: 'Last active',
          render: (member) => (
            <span className="whitespace-nowrap text-text-secondary">
              {formatLastActive(member)}
            </span>
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
