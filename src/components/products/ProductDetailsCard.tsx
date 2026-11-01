import { useFormContext } from 'react-hook-form';

import { type Category } from '@/types/catalogue';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { type ProductDetailInput } from '@/components/products/productDetailSchema';
import { flattenCategoryTree, indentCategoryLabel } from '@/utils/categoryTree';

export function ProductDetailsCard({
  categories,
  isReadOnly,
}: {
  categories: Category[];
  isReadOnly: boolean;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProductDetailInput>();

  const categoryOptions = flattenCategoryTree(categories).map(({ category, depth }) => ({
    value: String(category.id),
    label: indentCategoryLabel(category.name, depth),
  }));

  return (
    <Card title="Details">
      <div className="grid gap-3.5">
        <Input
          label="Name"
          disabled={isReadOnly}
          error={errors.title?.message}
          {...register('title')}
        />
        <Textarea
          label="Description"
          optional
          rows={4}
          disabled={isReadOnly}
          error={errors.description?.message}
          {...register('description')}
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
          <Select
            label="Category"
            placeholder="Choose…"
            options={categoryOptions}
            disabled={isReadOnly}
            error={errors.categoryId?.message}
            {...register('categoryId', {
              setValueAs: (value: unknown) =>
                value === '' || value === undefined ? undefined : Number(value),
            })}
          />
          <Input
            label="URL handle"
            prefix="/p/"
            hint="Old links keep working after you change it."
            disabled={isReadOnly}
            error={errors.slug?.message}
            {...register('slug')}
          />
        </div>
      </div>
    </Card>
  );
}
