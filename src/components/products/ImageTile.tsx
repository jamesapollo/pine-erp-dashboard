import { ChevronLeft, ChevronRight, Star, Trash2 } from 'lucide-react';

import { type ProductImage } from '@/types/catalogue';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/utils/cn';

/**
 * One product image. The actions appear on hover or keyboard focus; `actions` is undefined when
 * the viewer can't change images.
 */
export function ImageTile({
  image,
  actions,
}: {
  image: ProductImage;
  actions?: {
    isFirst: boolean;
    isLast: boolean;
    isDisabled: boolean;
    onSetAsCover: () => void;
    onMoveLeft: () => void;
    onMoveRight: () => void;
    onDelete: () => void;
  };
}) {
  return (
    <div
      className={cn(
        'group relative aspect-square overflow-hidden rounded-control bg-neutral-100',
        image.is_main ? 'border-2 border-brand-600' : 'border border-border-subtle',
      )}
    >
      <img src={image.url} alt={image.alt_text} className="size-full object-cover" />
      {image.is_main ? (
        <span className="absolute left-1.5 top-1.5">
          <Badge tone="info" size="sm">
            Cover
          </Badge>
        </span>
      ) : null}
      {actions ? (
        <div className="absolute inset-x-1 bottom-1 flex justify-between gap-0.5 rounded-control bg-surface-card p-0.5 opacity-0 shadow-xs transition-opacity duration-[120ms] focus-within:opacity-100 group-hover:opacity-100">
          {image.is_main ? null : (
            <IconButton
              icon={Star}
              label="Set as cover"
              size="sm"
              disabled={actions.isDisabled}
              onClick={actions.onSetAsCover}
            />
          )}
          <IconButton
            icon={ChevronLeft}
            label="Move left"
            size="sm"
            disabled={actions.isDisabled || actions.isFirst}
            onClick={actions.onMoveLeft}
          />
          <IconButton
            icon={ChevronRight}
            label="Move right"
            size="sm"
            disabled={actions.isDisabled || actions.isLast}
            onClick={actions.onMoveRight}
          />
          <IconButton
            icon={Trash2}
            label="Delete image"
            size="sm"
            disabled={actions.isDisabled}
            onClick={actions.onDelete}
          />
        </div>
      ) : null}
    </div>
  );
}
