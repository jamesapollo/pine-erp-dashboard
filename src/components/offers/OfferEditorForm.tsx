import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useBlocker, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { Trash2 } from 'lucide-react';

import { type Offer } from '@/types/pricing';
import {
  useSaveOfferMutation,
  type SaveOfferMutationParams,
} from '@/hooks/api/mutations/pricing/useSaveOfferMutation';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { DeleteOfferDialog } from '@/components/offers/DeleteOfferDialog';
import { OfferDetailsCard } from '@/components/offers/OfferDetailsCard';
import { OfferScheduleCard } from '@/components/offers/OfferScheduleCard';
import { buildOfferSchema, type OfferInput } from '@/components/offers/offerSchema';
import { OfferStatusCard } from '@/components/offers/OfferStatusCard';
import { OfferTargetsCard } from '@/components/offers/OfferTargetsCard';
import { UnsavedChangesDialog } from '@/components/products/UnsavedChangesDialog';
import { Alert } from '@/components/ui/Alert';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getActionErrorMessage, getFieldError } from '@/utils/apiErrors';
import { toMoneyInput } from '@/utils/money';
import { formatOfferDate, fromDateTimeLocal, toDateTimeLocal } from '@/utils/offers';
import { ROUTES } from '@/constants/routes';

const NEW_OFFER_DAYS = 7;

function getNewOfferValues(): OfferInput {
  // Tomorrow at midnight, for a week.
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 1);
  startsAt.setHours(0, 0, 0, 0);
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + NEW_OFFER_DAYS);
  return {
    name: '',
    type: 'percent_off',
    value: '',
    startsAt: toDateTimeLocal(startsAt.toISOString()),
    endsAt: toDateTimeLocal(endsAt.toISOString()),
    isActive: true,
    categoryIds: [],
    productIds: [],
  };
}

function getSavedValues(offer: Offer): OfferInput {
  return {
    name: offer.name,
    type: offer.type,
    // "15.00" reads as 15; a price keeps its pence.
    value: offer.type === 'percent_off' ? String(Number(offer.value)) : offer.value,
    startsAt: toDateTimeLocal(offer.starts_at),
    endsAt: toDateTimeLocal(offer.ends_at),
    isActive: offer.is_active,
    categoryIds: offer.categories.map((category) => category.id),
    productIds: offer.products.map((product) => product.id),
  };
}

function toRequestBody(values: OfferInput): SaveOfferMutationParams['body'] {
  return {
    name: values.name.trim(),
    type: values.type,
    value:
      values.type === 'percent_off'
        ? Number(values.value.trim()).toFixed(2)
        : toMoneyInput(values.value),
    starts_at: fromDateTimeLocal(values.startsAt),
    ends_at: fromDateTimeLocal(values.endsAt),
    is_active: values.isActive,
    category_ids: values.categoryIds,
    product_ids: values.productIds,
  };
}

/** Creates an offer when `offer` is left out, otherwise edits it. */
export function OfferEditorForm({ offer }: { offer?: Offer }) {
  const navigate = useNavigate();
  const { hasPermission } = useAuthedSession();
  const saveMutation = useSaveOfferMutation();
  const [isDeleting, setIsDeleting] = useState(false);
  // Set once the offer is saved or deleted, so leaving for the list needs no prompt.
  const isLeavingRef = useRef(false);
  const isNew = offer === undefined;
  const isReadOnly = !hasPermission('pricing.manage');
  // Choosing targets reads the catalogue; without it the targets can only be shown.
  const isTargetsReadOnly = isReadOnly || !hasPermission('catalogue.view');
  const variantCount = offer?.variants.length ?? 0;
  const schema = useMemo(() => buildOfferSchema(variantCount), [variantCount]);

  const form = useForm<OfferInput>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: offer ? getSavedValues(offer) : getNewOfferValues(),
  });
  const {
    handleSubmit,
    formState: { isDirty },
  } = form;
  const isSaving = saveMutation.isPending;

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      !isSaving &&
      !isLeavingRef.current &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!isDirty) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);

  const error = saveMutation.error;
  const serverErrors = {
    name: getFieldError(error, 'name'),
    type: getFieldError(error, 'type'),
    value: getFieldError(error, 'value'),
    startsAt: getFieldError(error, 'starts_at'),
    endsAt: getFieldError(error, 'ends_at'),
    targets:
      getFieldError(error, 'targets') ??
      getFieldError(error, 'category_ids') ??
      getFieldError(error, 'product_ids'),
  };
  const hasServerFieldError = Object.values(serverErrors).some(Boolean);

  // handleSubmit is called from the submit event, not during render, so the callback may set the ref.
  function submitForm(event: FormEvent<HTMLFormElement>) {
    void handleSubmit((values) => {
      saveMutation.mutate(
        { offerId: offer?.id, body: toRequestBody(values) },
        {
          onSuccess: () => {
            isLeavingRef.current = true;
            navigate(ROUTES.OFFERS);
          },
        },
      );
    })(event);
  }

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={submitForm}>
        <PageHeader
          back={<BackLink to={ROUTES.OFFERS}>Offers</BackLink>}
          title={isNew ? 'Create offer' : offer.name}
          titleAside={isNew ? null : <StatusBadge kind="offer" status={offer.status} />}
          sub={
            isNew
              ? 'Put categories or products on sale for a set time.'
              : `${formatOfferDate(offer.starts_at)} – ${formatOfferDate(offer.ends_at)}`
          }
          actions={
            isReadOnly ? null : (
              <>
                {isNew ? null : (
                  <Button variant="secondary" onClick={() => setIsDeleting(true)}>
                    <Icon icon={Trash2} />
                    Delete
                  </Button>
                )}
                <Button variant="secondary" onClick={() => navigate(ROUTES.OFFERS)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSaving}>
                  {isNew ? 'Create offer' : 'Save changes'}
                </Button>
              </>
            )
          }
        />
        {saveMutation.isError && !hasServerFieldError ? (
          <div className="mb-4">
            <Alert tone="danger">{getActionErrorMessage(saveMutation.error)}</Alert>
          </div>
        ) : null}
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-[1.7_1_560px] flex-col gap-4">
            <OfferDetailsCard isReadOnly={isReadOnly} serverErrors={serverErrors} />
            <OfferScheduleCard isReadOnly={isReadOnly} serverErrors={serverErrors} />
            <OfferTargetsCard
              offer={offer}
              isReadOnly={isTargetsReadOnly}
              serverError={serverErrors.targets}
            />
          </div>
          <div className="sticky top-4 flex min-w-0 flex-[1_1_300px] flex-col gap-4">
            <OfferStatusCard isReadOnly={isReadOnly} />
          </div>
        </div>
      </form>
      {isDeleting && offer ? (
        <DeleteOfferDialog
          offer={offer}
          onClose={() => setIsDeleting(false)}
          onDeleted={() => {
            isLeavingRef.current = true;
          }}
        />
      ) : null}
      <UnsavedChangesDialog
        isOpen={blocker.state === 'blocked'}
        onKeepEditing={() => blocker.reset?.()}
        onDiscard={() => blocker.proceed?.()}
      />
    </FormProvider>
  );
}
