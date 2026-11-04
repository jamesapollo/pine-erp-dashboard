import { Link, useNavigate } from 'react-router-dom';

import { type Enquiry } from '@/types/enquiry';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatMovementTime } from '@/utils/movementTime';
import { messageDetailPath } from '@/constants/routes';

function firstLine(message: string): string {
  return message.trim().split(/\r?\n/, 1)[0] ?? '';
}

export function EnquiriesTable({
  enquiries,
  hasFilters,
}: {
  enquiries: Enquiry[];
  hasFilters: boolean;
}) {
  const navigate = useNavigate();

  return (
    <DataTable
      caption="Messages"
      rows={enquiries}
      getRowKey={(enquiry) => enquiry.id}
      onRowClick={(enquiry) => navigate(messageDetailPath(enquiry.id))}
      empty={
        hasFilters
          ? 'No messages in this view.'
          : "No messages yet. They'll appear here when someone writes to you from the website."
      }
      columns={[
        {
          key: 'sender',
          header: 'From',
          render: (enquiry) => (
            <div>
              <Link
                to={messageDetailPath(enquiry.id)}
                // The row navigates on click as well; stop the click reaching it twice.
                onClick={(event) => event.stopPropagation()}
                className="font-medium text-text-primary no-underline hover:underline focus-visible:rounded-chip focus-visible:shadow-focus focus-visible:outline-none"
              >
                {enquiry.name}
              </Link>
              <div className="text-xs text-text-tertiary">{enquiry.email}</div>
            </div>
          ),
        },
        {
          key: 'topic',
          header: 'Topic',
          render: (enquiry) => enquiry.topic ?? <span className="text-text-disabled">—</span>,
        },
        {
          key: 'message',
          header: 'Message',
          render: (enquiry) => (
            <span className="block max-w-[360px] truncate text-text-secondary">
              {firstLine(enquiry.message)}
            </span>
          ),
        },
        {
          key: 'status',
          header: 'Status',
          render: (enquiry) => <StatusBadge kind="enquiry" status={enquiry.status} size="sm" />,
        },
        {
          key: 'created_at',
          header: 'Received',
          render: (enquiry) => (
            <span className="whitespace-nowrap text-text-secondary">
              {formatMovementTime(enquiry.created_at)}
            </span>
          ),
        },
      ]}
    />
  );
}
