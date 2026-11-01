import { useState } from 'react';
import { Globe, MapPin, Plus, TriangleAlert } from 'lucide-react';

import { type DeliveryZone } from '@/types/sales';
import { useDeliveryZonesQuery } from '@/hooks/api/queries/sales/useDeliveryZonesQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { AddCountryDialog } from '@/components/store/AddCountryDialog';
import { CheckoutPreviewCard } from '@/components/store/CheckoutPreviewCard';
import { DeleteDeliveryZoneDialog } from '@/components/store/DeleteDeliveryZoneDialog';
import { DeliveryZoneDialog } from '@/components/store/DeliveryZoneDialog';
import { DeliveryZonesTable } from '@/components/store/DeliveryZonesTable';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { isStatus } from '@/utils/apiErrors';
import { formatCountry } from '@/utils/country';
import { getZoneCountries } from '@/utils/deliveryZones';

type OpenDialog =
  | { kind: 'add' }
  | { kind: 'edit'; zone: DeliveryZone }
  | { kind: 'delete'; zone: DeliveryZone }
  | { kind: 'country' };

const PAGE_SUB =
  'Buyers pick a zone at checkout and its fee is added to the order. Orders keep the zone name and fee they were placed with.';

function DeliveryZonesContent({ zones }: { zones: DeliveryZone[] }) {
  const { hasPermission } = useAuthedSession();
  const canManage = hasPermission('fulfilment.manage');
  // A country added here has no zones yet, so it lives only on this screen until its first zone.
  const [addedCountries, setAddedCountries] = useState<string[]>([]);
  const countries = [...new Set([...getZoneCountries(zones), ...addedCountries])];
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>(undefined);
  const country =
    selectedCountry && countries.includes(selectedCountry) ? selectedCountry : countries[0];
  const [dialog, setDialog] = useState<OpenDialog | null>(null);

  const countryZones = zones.filter((zone) => zone.country === country);
  const hasActiveZone = countryZones.some((zone) => zone.is_active);
  const countryName = country ? formatCountry(country) : '';
  // The fee prefix: the store's currency, as the API returns it on every zone.
  const currency = zones[0]?.fee.currency;
  const closeDialog = () => setDialog(null);

  const addZoneButton = (
    <Button onClick={() => setDialog({ kind: 'add' })}>
      <Icon icon={Plus} />
      Add zone
    </Button>
  );

  return (
    <div>
      <PageHeader
        title="Delivery zones"
        sub={PAGE_SUB}
        actions={
          canManage ? (
            <>
              <Button variant="secondary" onClick={() => setDialog({ kind: 'country' })}>
                <Icon icon={Globe} />
                Add country
              </Button>
              {country ? addZoneButton : null}
            </>
          ) : null
        }
      />
      {country === undefined ? (
        <Card>
          <EmptyState
            icon={MapPin}
            title="No delivery zones yet"
            description={
              canManage
                ? 'Add a country, then the zones you deliver to there with their fees.'
                : 'A manager adds the countries and zones buyers can choose at checkout.'
            }
          />
        </Card>
      ) : (
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-[1.7_1_560px]">
            <Card flush>
              <div className="px-5">
                <Tabs
                  label="Country"
                  value={country}
                  onChange={setSelectedCountry}
                  items={countries.map((code) => {
                    const activeCount = zones.filter(
                      (zone) => zone.country === code && zone.is_active,
                    ).length;
                    return {
                      value: code,
                      label: formatCountry(code),
                      count: activeCount > 0 ? activeCount : undefined,
                    };
                  })}
                />
              </div>
              {countryZones.length > 0 && !hasActiveZone ? (
                <div className="flex items-start gap-2.5 border-b border-border-subtle bg-warning-50 px-5 py-3 text-[13px] text-warning-700">
                  <Icon icon={TriangleAlert} className="mt-px shrink-0" />
                  <span>
                    No zones are on, so buyers in {countryName} can’t choose delivery. Set a fee and
                    switch at least one on.
                  </span>
                </div>
              ) : null}
              {countryZones.length > 0 ? (
                <DeliveryZonesTable
                  zones={countryZones}
                  canManage={canManage}
                  onEdit={(zone) => setDialog({ kind: 'edit', zone })}
                  onDelete={(zone) => setDialog({ kind: 'delete', zone })}
                />
              ) : (
                <div className="flex flex-col items-center pb-8">
                  <EmptyState
                    icon={MapPin}
                    title={`No zones for ${countryName}`}
                    description="Add a zone, like a city or region, with its delivery fee."
                  />
                  {canManage ? addZoneButton : null}
                </div>
              )}
            </Card>
          </div>
          <div className="sticky top-[calc(var(--topbar-height)+16px)] min-w-0 flex-[1_1_300px]">
            <CheckoutPreviewCard countryName={countryName} zones={countryZones} />
          </div>
        </div>
      )}
      {country && (dialog?.kind === 'add' || dialog?.kind === 'edit') ? (
        <DeliveryZoneDialog
          country={country}
          zone={dialog.kind === 'edit' ? dialog.zone : undefined}
          countryZones={countryZones}
          currency={currency}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'delete' ? (
        <DeleteDeliveryZoneDialog zone={dialog.zone} onClose={closeDialog} />
      ) : null}
      {dialog?.kind === 'country' ? (
        <AddCountryDialog
          existingCountries={countries}
          onClose={closeDialog}
          onAdd={(code) => {
            setAddedCountries((current) => [...current, code]);
            setSelectedCountry(code);
            closeDialog();
          }}
        />
      ) : null}
    </div>
  );
}

export function DeliveryZonesPage() {
  const zonesQuery = useDeliveryZonesQuery();

  if (zonesQuery.isError) {
    if (isStatus(zonesQuery.error, 403)) {
      return (
        <>
          <PageHeader title="Delivery zones" />
          <NoAccess message="You don't have access to orders." />
        </>
      );
    }
    return (
      <>
        <PageHeader title="Delivery zones" sub={PAGE_SUB} />
        <div className="flex flex-col items-start gap-3">
          <Alert tone="danger">Couldn&apos;t load delivery zones. Try again.</Alert>
          <Button variant="secondary" onClick={() => zonesQuery.refetch()}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  if (zonesQuery.isPending) {
    return (
      <div className="flex justify-center p-10 text-text-tertiary">
        <Spinner label="Loading delivery zones" />
      </div>
    );
  }

  return <DeliveryZonesContent zones={zonesQuery.data} />;
}
