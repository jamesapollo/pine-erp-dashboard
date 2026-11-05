import { useFormContext, useWatch } from 'react-hook-form';
import { Percent, Tag, type LucideIcon } from 'lucide-react';

import { type OfferInput } from '@/components/offers/offerSchema';
import { Card } from '@/components/ui/Card';
import { FormErrorMessage } from '@/components/ui/FormErrorMessage';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';

function OfferTypeOption({
  value,
  icon,
  title,
  description,
  isDisabled,
}: {
  value: OfferInput['type'];
  icon: LucideIcon;
  title: string;
  description: string;
  isDisabled: boolean;
}) {
  const { register } = useFormContext<OfferInput>();
  return (
    <label
      className={cn(
        'group flex min-w-[180px] flex-1 items-start gap-3 rounded-[var(--radius-md)] border border-border-default bg-surface-card p-3.5 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:shadow-[0_0_0_1px_var(--brand-600)] has-[:focus-visible]:shadow-focus',
        isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      )}
    >
      <input
        type="radio"
        value={value}
        disabled={isDisabled}
        className="sr-only"
        {...register('type')}
      />
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-neutral-100 text-text-secondary group-has-[:checked]:bg-brand-600 group-has-[:checked]:text-white">
        <Icon icon={icon} size={16} />
      </span>
      <span>
        <span className="block text-sm font-medium text-text-primary">{title}</span>
        <span className="mt-0.5 block text-[13px] text-text-secondary">{description}</span>
      </span>
    </label>
  );
}

export function OfferDetailsCard({
  isReadOnly,
  serverErrors,
}: {
  isReadOnly: boolean;
  serverErrors: { name?: string; type?: string; value?: string };
}) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<OfferInput>();
  const type = useWatch({ control, name: 'type' });
  const valueError = errors.value?.message ?? serverErrors.value;

  return (
    <Card title="Offer">
      <div className="grid gap-4">
        <Input
          label="Name"
          placeholder="Mashujaa Day sale"
          hint="Only staff see this. Buyers see the discounted price."
          autoComplete="off"
          maxLength={120}
          disabled={isReadOnly}
          error={errors.name?.message ?? serverErrors.name}
          {...register('name')}
        />
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 p-0 text-[13px] font-medium leading-tight text-text-primary">
            Discount
          </legend>
          <div className="flex flex-wrap gap-3">
            <OfferTypeOption
              value="percent_off"
              icon={Percent}
              title="Percent off"
              description="Take a percentage off each variant's price"
              isDisabled={isReadOnly}
            />
            <OfferTypeOption
              value="sale_price"
              icon={Tag}
              title="Sale price"
              description="Sell every targeted variant at one fixed price"
              isDisabled={isReadOnly}
            />
          </div>
          <FormErrorMessage id="offer-type-error" message={serverErrors.type} />
        </fieldset>
        <div className="w-[220px]">
          {type === 'percent_off' ? (
            <Input
              key="percent_off"
              label="Percent off"
              suffix="%"
              placeholder="15"
              inputMode="decimal"
              disabled={isReadOnly}
              error={valueError}
              {...register('value')}
            />
          ) : (
            <Input
              key="sale_price"
              label="Sale price"
              prefix="KES"
              placeholder="3,990.00"
              inputMode="decimal"
              disabled={isReadOnly}
              error={valueError}
              {...register('value')}
            />
          )}
        </div>
      </div>
    </Card>
  );
}
