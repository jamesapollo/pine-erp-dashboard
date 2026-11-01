import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';

import { type DeliveryZone } from '@/types/sales';
import { useReorderDeliveryZonesMutation } from '@/hooks/api/mutations/sales/useReorderDeliveryZonesMutation';
import { useSaveDeliveryZoneMutation } from '@/hooks/api/mutations/sales/useSaveDeliveryZoneMutation';
import { useToastContext } from '@/components/ui/ToastContext';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { Switch } from '@/components/ui/Switch';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { cn } from '@/utils/cn';
import { formatZoneFee } from '@/utils/deliveryZones';

const ROW_GRID = 'grid grid-cols-[28px_minmax(0,1fr)_140px_90px_76px] items-center gap-3 px-5';

/** One country's zones in checkout order, with reorder, on/off, edit and delete for managers. */
export function DeliveryZonesTable({
  zones,
  canManage,
  onEdit,
  onDelete,
}: {
  zones: DeliveryZone[];
  canManage: boolean;
  onEdit: (zone: DeliveryZone) => void;
  onDelete: (zone: DeliveryZone) => void;
}) {
  const saveMutation = useSaveDeliveryZoneMutation();
  const reorderMutation = useReorderDeliveryZonesMutation();
  const { showToast } = useToastContext();

  function move(index: number, step: -1 | 1) {
    const reordered = [...zones];
    [reordered[index], reordered[index + step]] = [reordered[index + step], reordered[index]];
    reorderMutation.mutate(reordered);
  }

  function toggle(zone: DeliveryZone) {
    saveMutation.mutate(
      {
        zoneId: zone.id,
        body: { is_active: !zone.is_active },
        successTitle: zone.is_active ? 'Zone switched off' : 'Zone live at checkout',
      },
      { onError: (error) => showToast({ title: getActionErrorMessage(error), tone: 'danger' }) },
    );
  }

  return (
    <div role="table" aria-label="Delivery zones">
      <div
        role="row"
        className={cn(
          ROW_GRID,
          'h-9 border-b border-border-default bg-surface-sunken text-[length:var(--text-xs)] font-medium leading-none text-text-tertiary',
        )}
      >
        <span role="columnheader">
          <span className="sr-only">Order</span>
        </span>
        <span role="columnheader">Zone</span>
        <span role="columnheader" className="text-right">
          Fee
        </span>
        <span role="columnheader">At checkout</span>
        <span role="columnheader">
          <span className="sr-only">Actions</span>
        </span>
      </div>
      {zones.map((zone, index) => (
        <div
          key={zone.id}
          role="row"
          className={cn(ROW_GRID, 'min-h-12 border-b border-border-subtle')}
        >
          <div role="cell" className="flex flex-col">
            {canManage ? (
              <>
                <button
                  type="button"
                  aria-label={`Move ${zone.name} up`}
                  disabled={index === 0 || reorderMutation.isPending}
                  onClick={() => move(index, -1)}
                  className="flex h-3.5 cursor-pointer items-center border-0 bg-transparent p-0 text-text-tertiary hover:enabled:text-text-primary disabled:cursor-default disabled:text-border-default"
                >
                  <ChevronUp size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${zone.name} down`}
                  disabled={index === zones.length - 1 || reorderMutation.isPending}
                  onClick={() => move(index, 1)}
                  className="flex h-3.5 cursor-pointer items-center border-0 bg-transparent p-0 text-text-tertiary hover:enabled:text-text-primary disabled:cursor-default disabled:text-border-default"
                >
                  <ChevronDown size={14} aria-hidden />
                </button>
              </>
            ) : null}
          </div>
          <div role="cell" className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                'truncate text-sm font-medium',
                zone.is_active ? 'text-text-primary' : 'text-text-secondary',
              )}
            >
              {zone.name}
            </span>
            {zone.is_active ? null : <Badge size="sm">Off</Badge>}
          </div>
          <span
            role="cell"
            className={cn(
              'text-right text-sm tabular-nums',
              Number(zone.fee.amount) === 0 ? 'text-brand-700' : 'text-text-primary',
            )}
          >
            {formatZoneFee(zone.fee)}
          </span>
          <div role="cell">
            <Switch
              aria-label={`Show ${zone.name} at checkout`}
              checked={zone.is_active}
              disabled={!canManage || saveMutation.isPending}
              onChange={() => toggle(zone)}
            />
          </div>
          <div role="cell" className="flex justify-end gap-0.5">
            {canManage ? (
              <>
                <IconButton
                  icon={Pencil}
                  label={`Edit ${zone.name}`}
                  size="sm"
                  onClick={() => onEdit(zone)}
                />
                <IconButton
                  icon={Trash2}
                  label={`Delete ${zone.name}`}
                  size="sm"
                  onClick={() => onDelete(zone)}
                />
              </>
            ) : null}
          </div>
        </div>
      ))}
      <p className="m-0 px-5 py-2.5 text-[13px] text-text-tertiary">
        Order here is the order buyers see. Use a fee of 0 for free delivery or in-store pickup.
      </p>
    </div>
  );
}
