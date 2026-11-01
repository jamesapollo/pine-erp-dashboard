import { useFormContext } from 'react-hook-form';

import { type ProductStatus } from '@/types/catalogue';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Switch } from '@/components/ui/Switch';
import { DetailRow } from '@/components/products/DetailRow';
import { type ProductDetailInput } from '@/components/products/productDetailSchema';

const STATUS_EXPLANATIONS: Record<ProductStatus, string> = {
  published: 'Live on the storefront. Variants switched off can’t be bought.',
  draft: 'Hidden from the storefront until you publish.',
  archived: 'Archived products are hidden and can’t be ordered.',
};

export function VisibilityCard({
  status,
  isReadOnly,
}: {
  status: ProductStatus;
  isReadOnly: boolean;
}) {
  const { register } = useFormContext<ProductDetailInput>();

  return (
    <Card title="Visibility">
      <div className="grid gap-3.5">
        <DetailRow label="Status" value={<StatusBadge kind="product" status={status} />} />
        <Switch
          label="Featured on homepage"
          disabled={isReadOnly || status !== 'published'}
          {...register('isFeatured')}
        />
        <div className="text-[13px] text-text-tertiary">{STATUS_EXPLANATIONS[status]}</div>
      </div>
    </Card>
  );
}
