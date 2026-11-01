import { useId } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import { type DeliveryZone } from '@/types/sales';
import { useSaveDeliveryZoneMutation } from '@/hooks/api/mutations/sales/useSaveDeliveryZoneMutation';
import {
  buildDeliveryZoneSchema,
  isFreeFee,
  type DeliveryZoneInput,
} from '@/components/store/deliveryZoneSchema';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { getActionErrorMessage, getFieldError } from '@/utils/apiErrors';
import { formatCountry } from '@/utils/country';

// Render it only while open, so each opening starts from the zone (or empty for a new one).
export function DeliveryZoneDialog({
  country,
  zone,
  countryZones,
  currency,
  onClose,
}: {
  country: string;
  /** Absent to add a zone. */
  zone?: DeliveryZone;
  countryZones: DeliveryZone[];
  /** The store's currency for the fee prefix; unknown until the store has a zone. */
  currency?: string;
  onClose: () => void;
}) {
  const formId = useId();
  const saveMutation = useSaveDeliveryZoneMutation();
  const countryName = formatCountry(country);
  const isAdding = zone === undefined;
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DeliveryZoneInput>({
    resolver: zodResolver(
      buildDeliveryZoneSchema({
        countryName,
        otherZoneNames: countryZones
          .filter((candidate) => candidate.id !== zone?.id)
          .map((candidate) => candidate.name),
      }),
    ),
    mode: 'onSubmit',
    defaultValues: {
      name: zone?.name ?? '',
      fee: zone ? zone.fee.amount : '',
      isActive: zone?.is_active ?? true,
    },
  });
  const fee = useWatch({ control, name: 'fee' });

  const serverNameError = getFieldError(saveMutation.error, 'name');
  const serverFeeError = getFieldError(saveMutation.error, 'fee');
  const hasServerFieldError = Boolean(serverNameError || serverFeeError);

  const onSubmit = handleSubmit((values) => {
    const body = {
      name: values.name.trim(),
      fee: Number(values.fee).toFixed(2),
      is_active: values.isActive,
    };
    saveMutation.mutate(
      isAdding
        ? {
            body: { ...body, country, sort_order: countryZones.length },
            successTitle: 'Zone added',
          }
        : { zoneId: zone.id, body, successTitle: 'Zone saved' },
      { onSuccess: onClose },
    );
  });

  return (
    <Dialog
      isOpen
      title={isAdding ? 'Add zone' : 'Edit zone'}
      description={countryName}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={saveMutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} isLoading={saveMutation.isPending}>
            {isAdding ? 'Add zone' : 'Save'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} className="grid gap-3.5">
        {saveMutation.isError && !hasServerFieldError ? (
          <Alert tone="danger">{getActionErrorMessage(saveMutation.error)}</Alert>
        ) : null}
        <Input
          label="Name"
          autoFocus
          placeholder="Nairobi environs"
          hint="Shown to buyers at checkout"
          error={errors.name?.message ?? serverNameError}
          {...register('name')}
        />
        <Input
          label="Fee"
          prefix={currency}
          placeholder="350.00"
          inputMode="decimal"
          autoComplete="off"
          className="w-[200px]"
          hint={fee.trim() !== '' && isFreeFee(fee) ? 'Shown as “Free”' : undefined}
          error={errors.fee?.message ?? serverFeeError}
          {...register('fee')}
        />
        <Switch label="Show at checkout" {...register('isActive')} />
        {isAdding ? null : (
          <p className="m-0 text-[13px] text-text-tertiary">
            Fee changes apply to new orders only.
          </p>
        )}
      </form>
    </Dialog>
  );
}
