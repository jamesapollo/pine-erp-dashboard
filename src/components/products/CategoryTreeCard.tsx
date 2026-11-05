import { ChevronDown, CornerDownRight, FolderTree } from 'lucide-react';

import { type Category } from '@/types/catalogue';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

// Tailwind needs whole class names, so each nesting level has its own indent.
const DEPTH_INDENT_CLASSES = ['pl-4', 'pl-[38px]', 'pl-[60px]', 'pl-[82px]'];

export function CategoryTreeCard({
  rows,
  selectedId,
  onSelect,
}: {
  rows: { category: Category; depth: number }[];
  selectedId: number | undefined;
  onSelect: (categoryId: number) => void;
}) {
  return (
    <Card
      flush
      title="Tree"
      subtitle={`${rows.length} ${rows.length === 1 ? 'category' : 'categories'}`}
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories yet"
          description="Products show without a category until you add one."
        />
      ) : (
        <ul aria-label="Categories" className="m-0 list-none p-0">
          {rows.map(({ category, depth }) => {
            const hasChildren = (category.children ?? []).length > 0;
            const isSelected = category.id === selectedId;
            return (
              <li key={category.id} className="border-b border-border-subtle last:border-b-0">
                <button
                  type="button"
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() => onSelect(category.id)}
                  className={cn(
                    'flex h-[var(--row-height)] w-full cursor-pointer items-center gap-2.5 border-0 pr-4 text-left text-sm font-medium text-text-primary focus-visible:shadow-focus focus-visible:outline-none',
                    DEPTH_INDENT_CLASSES[Math.min(depth, DEPTH_INDENT_CLASSES.length - 1)],
                    isSelected ? 'bg-surface-selected' : 'bg-transparent hover:bg-surface-hover',
                  )}
                >
                  <span aria-hidden className="inline-flex w-3.5 shrink-0 text-text-tertiary">
                    {hasChildren ? (
                      <Icon icon={ChevronDown} size={14} />
                    ) : depth > 0 ? (
                      <Icon icon={CornerDownRight} size={13} />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{category.name}</span>
                  {category.kind === 'standard' ? null : (
                    <Badge size="sm" tone="info">
                      Automatic
                    </Badge>
                  )}
                  {category.is_visible ? null : (
                    <Badge size="sm" tone="neutral">
                      Hidden
                    </Badge>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
