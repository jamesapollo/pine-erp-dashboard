import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type EnquiryDetail } from '@/types/enquiry';
import { invalidateEnquiries } from '@/hooks/api/mutations/enquiries/invalidateEnquiries';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { isStatus } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export type ChangeEnquiryStatusMutationParams = { status: 'closed' | 'new' };

export async function changeEnquiryStatus(
  storeId: number,
  enquiryId: number,
  body: ChangeEnquiryStatusMutationParams,
): Promise<EnquiryDetail> {
  const { data } = await axiosInstance.patch<{ data: EnquiryDetail }>(
    storePath(storeId, `/enquiries/${enquiryId}`),
    body,
  );
  return data.data;
}

// The page shows the error. A 409 means someone else changed the message, so it is loaded again.
export function useChangeEnquiryStatusMutation(enquiryId: number) {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: ChangeEnquiryStatusMutationParams) =>
      changeEnquiryStatus(store.id, enquiryId, params),
    onSuccess: () => invalidateEnquiries(queryClient, store.id),
    onError: (error) => {
      if (isStatus(error, 409)) void invalidateEnquiries(queryClient, store.id);
    },
  });
}
