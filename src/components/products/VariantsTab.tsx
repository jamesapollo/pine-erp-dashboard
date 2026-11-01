import { useMutation } from '@tanstack/react-query';
import { useFormContext, useWatch } from 'react-hook-form';

import { type Product, type ProductVariant } from '@/types/catalogue';
import { updateVariant } from '@/hooks/api/mutations/catalogue/useUpdateVariantMutation';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { OrderRef } from '@/components/ui/OrderRef';
import { Switch } from '@/components/ui/Switch';
import { useToastContext } from '@/components/ui/ToastContext';
import { type ProductDetailInput } from '@/components/products/productDetailSchema';
import { StockCount } from '@/components/products/StockCount';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { cn } from '@/utils/cn';
import { getVariantLabel } from '@/utils/variantLabel';

type ToggleParams = { variantId: number; isActive: boolean };

/**
 * The product's variants. Prices are part of the detail form and go out with "Save changes";
 * the Sellable switch applies straight away.
 */
export function VariantsTab({
  product,
  isReadOnly,
  isSaving,
  canSetPrices,
  onVariantSaved,
  onError,
}: {
  product: Product;
  isReadOnly: boolean;
  isSaving: boolean;
  canSetPrices: boolean;
  onVariantSaved: (variant: ProductVariant) => Promise<void>;
  onError: (message: string | undefined) => void;
}) {
  const { store } = useAuthedSession();
  const { showToast } = useToastContext();
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ProductDetailInput>();
  const basePrice = useWatch({ control, name: 'basePrice' });

  // The response goes into the product before the mutation settles, so the switch never
  // flickers back to its old state.
  const toggleMutation = useMutation({
    mutationFn: async ({ variantId, isActive }: ToggleParams) => {
      const updated = await updateVariant(store.id, product.id, variantId, {
        is_active: isActive,
      });
      await onVariantSaved(updated);
      return updated;
    },
  });
  const pendingToggle = toggleMutation.isPending ? toggleMutation.variables : undefined;

  function toggle(variant: ProductVariant, isActive: boolean) {
    onError(undefined);
    toggleMutation.mutate(
      { variantId: variant.id, isActive },
      {
        onSuccess: (updated) =>
          showToast({ title: 'Variant updated', description: getVariantLabel(updated) }),
        onError: (error) => onError(getActionErrorMessage(error)),
      },
    );
  }

  const columns = [
    {
      key: 'label',
      header: 'Variant',
      render: (variant: ProductVariant) => (
        <span className={cn('whitespace-nowrap font-medium', !variant.is_active && 'opacity-50')}>
          {getVariantLabel(variant)}
        </span>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (variant: ProductVariant) => <OrderRef value={variant.sku} plain />,
    },
    {
      key: 'price',
      header: 'Price (KES)',
      align: 'right' as const,
      width: 140,
      render: (variant: ProductVariant) => (
        <Input
          label={`Price for ${getVariantLabel(variant)}`}
          hideLabel
          size="sm"
          inputMode="decimal"
          placeholder={basePrice.trim() || '0.00'}
          disabled={isReadOnly || !canSetPrices}
          error={errors.variantPrices?.[String(variant.id)]?.message}
          className="ml-auto w-[110px] [&_input]:text-right"
          {...register(`variantPrices.${variant.id}`)}
        />
      ),
    },
    {
      key: 'available',
      header: 'Available',
      align: 'right' as const,
      render: (variant: ProductVariant) => <StockCount value={variant.stock.available} />,
    },
    {
      key: 'sellable',
      header: 'Sellable',
      width: 90,
      render: (variant: ProductVariant) => (
        <Switch
          aria-label="Sellable"
          checked={
            pendingToggle?.variantId === variant.id ? pendingToggle.isActive : variant.is_active
          }
          disabled={isReadOnly || isSaving || toggleMutation.isPending}
          onChange={(event) => toggle(variant, event.target.checked)}
        />
      ),
    },
  ];

  return (
    <DataTable
      caption="Variants"
      columns={columns}
      rows={product.variants}
      getRowKey={(variant) => variant.id}
      empty="No variants yet."
    />
  );
}
