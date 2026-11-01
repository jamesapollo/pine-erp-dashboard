import { useFormContext } from 'react-hook-form';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DetailRow } from '@/components/products/DetailRow';
import { type ProductDetailInput } from '@/components/products/productDetailSchema';

export function PricingCard({
  priceRange,
  canSetPrices,
  isReadOnly,
}: {
  priceRange: string;
  canSetPrices: boolean;
  isReadOnly: boolean;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProductDetailInput>();

  return (
    <Card title="Pricing">
      <div className="grid gap-3.5">
        <Input
          label="Base price"
          prefix="KES"
          placeholder="0.00"
          inputMode="decimal"
          disabled={isReadOnly || !canSetPrices}
          hint={
            canSetPrices ? 'Variants inherit this unless you override it' : "You can't set prices"
          }
          error={errors.basePrice?.message}
          {...register('basePrice')}
        />
        <DetailRow label="Price range" value={priceRange} />
      </div>
    </Card>
  );
}
