import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type OptionValue } from '@/types/catalogue';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export type UpdateOptionValueMutationParams = {
  optionTypeId: number;
  optionValueId: number;
  value?: string;
  sort_order?: number;
  is_active?: boolean;
  /** Toast shown on success; omitted for silent updates such as reordering. */
  successToast?: { title: string; description?: string };
};

export function useUpdateOptionValueMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async ({
      optionTypeId,
      optionValueId,
      value,
      sort_order,
      is_active,
    }: UpdateOptionValueMutationParams) => {
      const { data } = await axiosInstance.patch<{ data: OptionValue }>(
        storePath(store.id, `/option-types/${optionTypeId}/values/${optionValueId}`),
        { value, sort_order, is_active },
      );
      return data.data;
    },
    onSuccess: async (_optionValue, { successToast }) => {
      // Variant labels on products show the value's name, so a rename or retire refreshes them.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.optionTypes(store.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) }),
      ]);
      if (successToast) showToast(successToast);
    },
    onError: (error) => {
      showToast({ title: getActionErrorMessage(error), tone: 'danger' });
    },
  });
}
