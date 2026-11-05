import { Link, useNavigate } from 'react-router-dom';
import { Tag } from 'lucide-react';

import { type Offer } from '@/types/pricing';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  describeOfferTiming,
  formatOfferDate,
  formatOfferDiscount,
  summariseOfferTargets,
} from '@/utils/offers';
import { buildOfferPath } from '@/constants/routes';

export function OffersTable({ offers, hasFilters }: { offers: Offer[]; hasFilters: boolean }) {
  const navigate = useNavigate();

  if (!offers.length && !hasFilters) {
    return (
      <EmptyState
        icon={Tag}
        title="No offers yet"
        description="Create an offer to put a category or product on sale for a set time."
      />
    );
  }

  return (
    <DataTable
      caption="Offers"
      rows={offers}
      getRowKey={(offer) => offer.id}
      onRowClick={(offer) => navigate(buildOfferPath(offer.id))}
      empty="No offers in this view."
      columns={[
        {
          key: 'name',
          header: 'Offer',
          render: (offer) => (
            <div>
              <Link
                to={buildOfferPath(offer.id)}
                // The row navigates on click as well; stop the click reaching it twice.
                onClick={(event) => event.stopPropagation()}
                className="font-medium text-text-primary no-underline hover:underline focus-visible:rounded-chip focus-visible:shadow-focus focus-visible:outline-none"
              >
                {offer.name}
              </Link>
              <div className="text-xs text-text-tertiary">{summariseOfferTargets(offer)}</div>
            </div>
          ),
        },
        {
          key: 'discount',
          header: 'Discount',
          render: (offer) => (
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <Badge size="sm" tone="clay">
                {formatOfferDiscount(offer)}
              </Badge>
              <span className="text-xs text-text-tertiary">
                {offer.type === 'percent_off' ? 'Percent off' : 'Sale price'}
              </span>
            </span>
          ),
        },
        {
          key: 'runs',
          header: 'Runs',
          render: (offer) => (
            <div className="whitespace-nowrap">
              <div className="tabular-nums">
                {formatOfferDate(offer.starts_at)} – {formatOfferDate(offer.ends_at)}
              </div>
              <div
                className={
                  offer.status === 'live' ? 'text-xs text-brand-700' : 'text-xs text-text-tertiary'
                }
              >
                {describeOfferTiming(offer)}
              </div>
            </div>
          ),
        },
        {
          key: 'status',
          header: 'Status',
          render: (offer) => <StatusBadge kind="offer" status={offer.status} size="sm" />,
        },
      ]}
    />
  );
}
