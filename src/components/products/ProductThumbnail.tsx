import { Image } from 'lucide-react';

import { type ProductImage } from '@/types/catalogue';
import { Icon } from '@/components/ui/Icon';

export function ProductThumbnail({ image }: { image: ProductImage | null }) {
  if (image) {
    return (
      <img
        src={image.url}
        alt={image.alt_text}
        className="size-10 shrink-0 rounded-[8px] object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-neutral-100 text-text-tertiary"
    >
      <Icon icon={Image} size={18} />
    </div>
  );
}
