import { ChevronRight } from 'lucide-react';

import { type OptionType } from '@/types/catalogue';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

export function OptionTypeList({
  optionTypes,
  selectedId,
  onSelect,
}: {
  optionTypes: OptionType[];
  selectedId: number | undefined;
  onSelect: (optionTypeId: number) => void;
}) {
  return (
    <Card flush className="min-w-0 max-w-[340px] flex-[1_1_260px]">
      <ul aria-label="Option types" className="m-0 flex list-none flex-col p-1.5">
        {optionTypes.map((optionType) => {
          const activeValues = optionType.values.filter((optionValue) => optionValue.is_active);
          const isSelected = optionType.id === selectedId;
          return (
            <li key={optionType.id}>
              <button
                type="button"
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => onSelect(optionType.id)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 rounded-control border-0 px-3 py-2.5 text-left text-text-primary focus-visible:shadow-focus focus-visible:outline-none',
                  isSelected ? 'bg-surface-selected' : 'bg-transparent hover:bg-surface-hover',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{optionType.name}</span>
                  <span className="block truncate text-xs text-text-tertiary">
                    {activeValues.map((optionValue) => optionValue.value).join(', ') ||
                      'No values yet'}
                  </span>
                </span>
                <span className="text-xs tabular-nums text-text-secondary">
                  {activeValues.length}
                </span>
                <Icon icon={ChevronRight} size={16} className="text-text-tertiary" />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
