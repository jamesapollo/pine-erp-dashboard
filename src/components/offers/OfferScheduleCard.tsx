import { useFormContext, useWatch } from 'react-hook-form';

import { type OfferInput } from '@/components/offers/offerSchema';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

const DAY_MILLISECONDS = 86_400_000;

function describeRun(startsAt: string, endsAt: string): string | undefined {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return undefined;
  const days = Math.round((end - start) / DAY_MILLISECONDS);
  if (days < 1) return 'Runs less than a day';
  return `Runs ${days} ${days === 1 ? 'day' : 'days'}`;
}

export function OfferScheduleCard({
  isReadOnly,
  serverErrors,
}: {
  isReadOnly: boolean;
  serverErrors: { startsAt?: string; endsAt?: string };
}) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<OfferInput>();
  const [startsAt, endsAt] = useWatch({ control, name: ['startsAt', 'endsAt'] });
  const endsAtError = errors.endsAt?.message ?? serverErrors.endsAt;

  return (
    <Card title="Schedule" subtitle="Offers start and stop on their own">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <Input
          label="Starts"
          type="datetime-local"
          disabled={isReadOnly}
          error={errors.startsAt?.message ?? serverErrors.startsAt}
          {...register('startsAt')}
        />
        <Input
          label="Ends"
          type="datetime-local"
          disabled={isReadOnly}
          error={endsAtError}
          hint={endsAtError ? undefined : describeRun(startsAt, endsAt)}
          {...register('endsAt')}
        />
      </div>
    </Card>
  );
}
