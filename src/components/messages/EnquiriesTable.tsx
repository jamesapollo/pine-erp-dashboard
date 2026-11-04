import { Link, useNavigate } from 'react-router-dom';

import { type Enquiry, type EnquiryStatus } from '@/types/enquiry';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { formatMovementTime } from '@/utils/movementTime';
import { messageDetailPath } from '@/constants/routes';

const STATUS_BADGES: Record<EnquiryStatus, [BadgeTone, string]> = {
  new: ['primary', 'New'],
  replied: ['success', 'Replied'],
  closed: ['neutral', 'Closed'],
};

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
          render: (enquiry) => {
            const [tone, label] = STATUS_BADGES[enquiry.status];
            return (
              <Badge tone={tone} size="sm" dot>
                {label}
              </Badge>
            );
          },
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
