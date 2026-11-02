import { Badge, type BadgeTone } from '@/components/ui/Badge';

const STATUS_MAP = {
  order: {
    pending: ['warning', 'Pending'],
    confirmed: ['primary', 'Confirmed'],
    dispatched: ['info', 'Dispatched'],
    completed: ['success', 'Completed'],
    cancelled: ['neutral', 'Cancelled'],
  },
  delivery: {
    preparing: ['clay', 'Preparing'],
    dispatched: ['info', 'Dispatched'],
    in_transit: ['info', 'In transit'],
    delivered: ['success', 'Delivered'],
    failed: ['danger', 'Failed'],
    returned: ['neutral', 'Returned'],
    cancelled: ['neutral', 'Cancelled'],
  },
  product: {
    draft: ['neutral', 'Draft'],
    published: ['success', 'Published'],
    archived: ['clay', 'Archived'],
  },
  offer: {
    scheduled: ['info', 'Scheduled'],
    live: ['success', 'Live'],
    ended: ['neutral', 'Ended'],
    inactive: ['neutral', 'Inactive'],
  },
  membership: {
    invited: ['info', 'Invited'],
    active: ['success', 'Active'],
    suspended: ['neutral', 'Deactivated'],
    deactivated: ['neutral', 'Deactivated'],
    revoked: ['neutral', 'Revoked'],
  },
  reservation: {
    active: ['warning', 'Held'],
    committed: ['primary', 'Committed'],
    released: ['neutral', 'Released'],
    expired: ['danger', 'Expired'],
    returned: ['neutral', 'Returned'],
  },
  movement: {
    receipt: ['success', 'Receipt'],
    adjustment: ['clay', 'Adjustment'],
    sale: ['info', 'Sale'],
    return: ['primary', 'Return'],
  },
  stock: {
    in_stock: ['success', 'In stock'],
    low: ['warning', 'Low stock'],
    out: ['danger', 'Out of stock'],
  },
  payment: {
    unpaid: ['warning', 'Unpaid'],
    arranged: ['info', 'Arranged offline'],
    paid: ['success', 'Paid'],
    refunded: ['neutral', 'Refunded'],
  },
} as const satisfies Record<string, Record<string, readonly [BadgeTone, string]>>;

export type StatusKind = keyof typeof STATUS_MAP;

export function StatusBadge({
  kind,
  status,
  size = 'md',
  label,
}: {
  kind: StatusKind;
  status: string;
  size?: 'sm' | 'md';
  label?: string;
}) {
  const entries: Record<string, readonly [BadgeTone, string]> = STATUS_MAP[kind];
  const [tone, defaultLabel] = entries[status] ?? ['neutral', status.replace(/_/g, ' ')];

  return (
    <Badge tone={tone} size={size} dot>
      {label ?? defaultLabel}
    </Badge>
  );
}
