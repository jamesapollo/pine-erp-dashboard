import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type ContactDetails } from '@/types/contactDetails';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useToastContext } from '@/components/ui/ToastContext';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

// A full replace: the API answers with the saved details. Errors are shown by the form.
export function useUpdateContactDetailsMutation() {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  return useMutation({
    mutationFn: async (body: ContactDetails) => {
      const { data } = await axiosInstance.put<{ data: ContactDetails }>(
        storePath(store.id, '/contact-details'),
        body,
      );
      return data.data;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.contactDetails(store.id), saved);
      showToast({ title: 'Contact details saved' });
    },
  });
}
