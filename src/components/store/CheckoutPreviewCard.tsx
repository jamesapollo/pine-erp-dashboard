import { type DeliveryZone } from '@/types/sales';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { formatZoneFee } from '@/utils/deliveryZones';

/** The delivery choice as a buyer in the country sees it: switched-on zones, first one picked. */
export function CheckoutPreviewCard({
  countryName,
  zones,
}: {
  countryName: string;
  zones: DeliveryZone[];
}) {
  const activeZones = zones.filter((zone) => zone.is_active);

  return (
    <Card title="Checkout preview" subtitle={`What a buyer in ${countryName} sees`}>
      {activeZones.length === 0 ? (
        <p className="m-0 text-[13px] text-text-tertiary">
          No zones on — delivery can’t be chosen at checkout.
        </p>
      ) : (
        <div className="grid gap-2" aria-hidden>
          <div className="mb-0.5 text-[13px] font-medium leading-[1.2]">Delivery</div>
          {activeZones.map((zone, index) => {
            const isPicked = index === 0;
            return (
              <div
                key={zone.id}
                className={cn(
                  'flex items-center gap-2.5 rounded-card px-3 py-2.5',
                  isPicked ? 'border-2 border-brand-600' : 'm-px border border-border-default',
                )}
              >
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px]',
                    isPicked ? 'border-brand-600' : 'border-border-strong',
                  )}
                >
                  {isPicked ? <span className="size-2 rounded-full bg-brand-600" /> : null}
                </span>
                <span className="flex-1 text-sm">{zone.name}</span>
                <span className="text-sm font-medium tabular-nums">{formatZoneFee(zone.fee)}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
