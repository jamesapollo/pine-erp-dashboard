import { useFormContext, useWatch } from 'react-hook-form';

import { type OfferStatus } from '@/types/pricing';
import { type OfferInput } from '@/components/offers/offerSchema';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Switch } from '@/components/ui/Switch';
import { formatOfferDate, getOfferStatus } from '@/utils/offers';

function toInstant(value: string): string | undefined {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function describeStatus(status: OfferStatus, startsAt: string): string {
  if (status === 'inactive') return 'Paused: no prices change, whatever the dates.';
  if (status === 'scheduled') return `Prices change automatically on ${formatOfferDate(startsAt)}.`;
  if (status === 'live') return 'Prices on the storefront are discounted now.';
  return 'This offer has finished. Move the end date to run it again.';
}

export function OfferStatusCard({ isReadOnly }: { isReadOnly: boolean }) {
  const { register, control } = useFormContext<OfferInput>();
  const [isActive, startsAtValue, endsAtValue] = useWatch({
    control,
    name: ['isActive', 'startsAt', 'endsAt'],
  });
  const startsAt = toInstant(startsAtValue);
  const endsAt = toInstant(endsAtValue);
  // Until both dates make sense only a pause can be described.
  const status =
    startsAt && endsAt
      ? getOfferStatus({ is_active: isActive, starts_at: startsAt, ends_at: endsAt })
      : undefined;

  return (
    <Card
      title="Status"
      actions={status ? <StatusBadge kind="offer" status={status} size="sm" /> : null}
    >
      <Switch label="Active" disabled={isReadOnly} {...register('isActive')} />
      {status ? (
        <p className="m-0 mt-2.5 text-[13px] text-text-tertiary">
          {describeStatus(status, startsAt ?? '')}
        </p>
      ) : null}
    </Card>
  );
}
