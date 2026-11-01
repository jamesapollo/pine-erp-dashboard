import { type OptionValue } from '@/types/catalogue';

export function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (toIndex < 0 || toIndex >= items.length || fromIndex < 0 || fromIndex >= items.length) {
    return [...items];
  }
  const reordered = [...items];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  return reordered;
}

export function getSortOrderChanges(values: OptionValue[]): { id: number; sort_order: number }[] {
  return values
    .map((value, index) => ({ id: value.id, sort_order: index, previous: value.sort_order }))
    .filter(({ sort_order, previous }) => sort_order !== previous)
    .map(({ id, sort_order }) => ({ id, sort_order }));
}
