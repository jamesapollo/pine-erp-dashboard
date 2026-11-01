import { useFormContext, useWatch } from 'react-hook-form';

import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import {
  MAXIMUM_VARIANT_ROWS,
  rowFieldKey,
  type ProductNewInput,
} from '@/components/products/productNewSchema';
import { type VariantCombination } from '@/utils/variantCombinations';

export function NewVariantsTable({
  combinations,
  canSetPrices,
  canRecordStock,
}: {
  combinations: VariantCombination[];
  canSetPrices: boolean;
  canRecordStock: boolean;
}) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ProductNewInput>();
  const basePrice = useWatch({ control, name: 'basePrice' });

  if (combinations.length > MAXIMUM_VARIANT_ROWS) {
    return (
      <p role="alert" className="m-0 px-5 py-4 text-[13px] text-danger-700">
        That&apos;s more than 200 variants. Choose fewer values.
      </p>
    );
  }

  // Row inputs unregister when their combination goes away, so a removed row's values are
  // neither validated nor saved.
  const columns = [
    {
      key: 'label',
      header: 'Variant',
      render: (row: VariantCombination) => (
        <span className="whitespace-nowrap font-medium">{row.label}</span>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: () => <span className="whitespace-nowrap text-text-tertiary">Generated on save</span>,
    },
    {
      key: 'price',
      header: 'Price (KES)',
      align: 'right' as const,
      render: (row: VariantCombination) => (
        <Input
          label={`Price for ${row.label}`}
          hideLabel
          size="sm"
          inputMode="decimal"
          placeholder={basePrice.trim() || '0.00'}
          disabled={!canSetPrices}
          error={errors.rows?.[rowFieldKey(row.key)]?.price?.message}
          className="ml-auto w-[110px] [&_input]:text-right"
          {...register(`rows.${rowFieldKey(row.key)}.price`, { shouldUnregister: true })}
        />
      ),
    },
    ...(canRecordStock
      ? [
          {
            key: 'stock',
            header: 'Opening stock',
            align: 'right' as const,
            render: (row: VariantCombination) => (
              <Input
                label={`Opening stock for ${row.label}`}
                hideLabel
                size="sm"
                inputMode="numeric"
                placeholder="0"
                error={errors.rows?.[rowFieldKey(row.key)]?.stock?.message}
                className="ml-auto w-[90px] [&_input]:text-right"
                {...register(`rows.${rowFieldKey(row.key)}.stock`, { shouldUnregister: true })}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <DataTable
      caption="Variants"
      columns={columns}
      rows={combinations}
      getRowKey={(row) => row.key}
      empty="Pick at least one value for each option."
    />
  );
}
