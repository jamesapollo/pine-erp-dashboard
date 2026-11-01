import { type ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { type OptionType } from '@/types/catalogue';
import { Chip } from '@/components/ui/Chip';
import { FormErrorMessage } from '@/components/ui/FormErrorMessage';
import { type ProductNewInput } from '@/components/products/productNewSchema';

function OptionLabel({ hint, children }: { hint?: string; children: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <span className="text-[13px] font-medium leading-[1.2] text-text-primary">{children}</span>
      {hint ? <span className="text-xs text-text-tertiary">{hint}</span> : null}
    </div>
  );
}

// Option types are kept in the order they were picked; that order becomes the product's.
export function OptionPicker({ optionTypes }: { optionTypes: OptionType[] }) {
  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<ProductNewInput>();
  const optionTypeIds = useWatch({ control, name: 'optionTypeIds' });
  const selectedValueIds = useWatch({ control, name: 'selectedValueIds' });

  function toggleOptionType(optionTypeId: number) {
    const currentTypeIds = getValues('optionTypeIds');
    const currentValueIds = { ...getValues('selectedValueIds') };
    if (currentTypeIds.includes(optionTypeId)) {
      delete currentValueIds[optionTypeId];
      setValue(
        'optionTypeIds',
        currentTypeIds.filter((id) => id !== optionTypeId),
        { shouldDirty: true },
      );
    } else {
      currentValueIds[optionTypeId] = [];
      setValue('optionTypeIds', [...currentTypeIds, optionTypeId], { shouldDirty: true });
    }
    setValue('selectedValueIds', currentValueIds, { shouldDirty: true });
  }

  function toggleValue(optionTypeId: number, valueId: number) {
    const currentValueIds = getValues('selectedValueIds');
    const valueIds = currentValueIds[optionTypeId] ?? [];
    setValue(
      'selectedValueIds',
      {
        ...currentValueIds,
        [optionTypeId]: valueIds.includes(valueId)
          ? valueIds.filter((id) => id !== valueId)
          : [...valueIds, valueId],
      },
      { shouldDirty: true },
    );
  }

  const chosenTypes = optionTypeIds.flatMap((optionTypeId) => {
    const optionType = optionTypes.find((candidate) => candidate.id === optionTypeId);
    return optionType ? [optionType] : [];
  });

  const hasOptionWithoutValues = chosenTypes.some(
    (optionType) => (selectedValueIds[optionType.id] ?? []).length === 0,
  );

  return (
    <div className="grid gap-[18px]">
      <div>
        <OptionLabel hint="Manage in Products → Option types">Option types</OptionLabel>
        <div className="flex flex-wrap gap-2">
          {optionTypes.map((optionType) => (
            <Chip
              key={optionType.id}
              isSelected={optionTypeIds.includes(optionType.id)}
              onClick={() => toggleOptionType(optionType.id)}
            >
              {optionType.name}
            </Chip>
          ))}
        </div>
      </div>
      {chosenTypes.map((optionType) => {
        const valueIds = selectedValueIds[optionType.id] ?? [];
        return (
          <div key={optionType.id} className="border-t border-border-subtle pt-3.5">
            <OptionLabel hint={`${valueIds.length} selected`}>{optionType.name}</OptionLabel>
            <div className="flex flex-wrap gap-2">
              {optionType.values
                .filter((value) => value.is_active)
                .map((value) => (
                  <Chip
                    key={value.id}
                    isSelected={valueIds.includes(value.id)}
                    onClick={() => toggleValue(optionType.id, value.id)}
                  >
                    {value.value}
                  </Chip>
                ))}
            </div>
          </div>
        );
      })}
      {/* The submit-time error stays only while an option still has no values picked. */}
      <FormErrorMessage
        id="option-values-error"
        message={hasOptionWithoutValues ? errors.optionTypeIds?.message : undefined}
      />
      {chosenTypes.length === 0 ? (
        <div className="text-[13px] text-text-tertiary">
          No options — the product is sold as a single item.
        </div>
      ) : null}
    </div>
  );
}
