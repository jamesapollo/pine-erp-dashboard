import { queryOptions, useQuery } from '@tanstack/react-query';

import { type OptionType } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function getOptionTypes(storeId: number): Promise<OptionType[]> {
  const { data } = await axiosInstance.get<{ data: OptionType[] }>(
    storePath(storeId, '/option-types'),
  );
  return data.data.map((optionType) => ({
    ...optionType,
    values: [...optionType.values].sort(
      (first, second) => first.sort_order - second.sort_order || first.id - second.id,
    ),
  }));
}

export function optionTypesQueryOptions(storeId: number) {
  return queryOptions({
    queryKey: queryKeys.optionTypes(storeId),
    queryFn: () => getOptionTypes(storeId),
  });
}

export function useOptionTypesQuery() {
  const { store } = useAuthedSession();
  return useQuery(optionTypesQueryOptions(store.id));
}
