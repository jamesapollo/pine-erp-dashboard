import { type OptionType } from '@/types/catalogue';

export type VariantCombination = { key: string; label: string; optionValueIds: number[] };

export const DEFAULT_COMBINATION_KEY = 'default';

// Every combination of the picked values, the first option type varying slowest; values follow
// each type's sort order. No option types means the product's single default variant.
export function buildVariantCombinations(
  selected: { optionType: OptionType; valueIds: number[] }[],
): VariantCombination[] {
  if (selected.length === 0) {
    return [{ key: DEFAULT_COMBINATION_KEY, label: 'Default', optionValueIds: [] }];
  }

  let combinations: { ids: number[]; names: string[] }[] = [{ ids: [], names: [] }];
  for (const { optionType, valueIds } of selected) {
    const values = optionType.values
      .filter((value) => valueIds.includes(value.id))
      .sort((first, second) => first.sort_order - second.sort_order || first.id - second.id);
    combinations = combinations.flatMap((combination) =>
      values.map((value) => ({
        ids: [...combination.ids, value.id],
        names: [...combination.names, value.value],
      })),
    );
  }

  return combinations.map(({ ids, names }) => ({
    key: ids.join('-'),
    label: names.join(' · '),
    optionValueIds: ids,
  }));
}
