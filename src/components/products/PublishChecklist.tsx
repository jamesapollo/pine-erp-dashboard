import { useFormContext, useWatch } from 'react-hook-form';
import { Circle, CircleCheck } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { type ProductNewInput } from '@/components/products/productNewSchema';
import { cn } from '@/utils/cn';
import { isValidPrice } from '@/utils/money';

export function PublishChecklist() {
  const { control } = useFormContext<ProductNewInput>();
  const [title, categoryId, basePrice, images] = useWatch({
    control,
    name: ['title', 'categoryId', 'basePrice', 'images'],
  });

  const items = [
    { label: 'Name', isDone: title.trim() !== '', isRecommended: false },
    { label: 'Category', isDone: categoryId !== undefined, isRecommended: false },
    { label: 'Price', isDone: isValidPrice(basePrice), isRecommended: false },
    { label: 'At least one image', isDone: images.length > 0, isRecommended: true },
  ];

  return (
    <Card title="Ready to publish?">
      <ul className="m-0 grid list-none gap-2.5 p-0">
        {items.map((item) => (
          <li
            key={item.label}
            className={cn(
              'flex items-center gap-2 text-sm',
              item.isDone ? 'text-text-primary' : 'text-text-secondary',
            )}
          >
            <Icon
              icon={item.isDone ? CircleCheck : Circle}
              className={item.isDone ? 'text-brand-600' : 'text-text-tertiary'}
            />
            {item.label}
            {item.isRecommended && !item.isDone ? (
              <span className="text-xs text-text-tertiary">recommended</span>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
