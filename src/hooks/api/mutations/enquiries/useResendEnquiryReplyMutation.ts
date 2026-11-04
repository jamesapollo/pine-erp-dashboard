import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type EnquiryReply } from '@/types/enquiry';
import { invalidateEnquiries } from '@/hooks/api/mutations/enquiries/invalidateEnquiries';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { isStatus } from '@/utils/apiErrors';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export async function resendEnquiryReply(
  storeId: number,
  enquiryId: number,
  replyId: number,
): Promise<EnquiryReply> {
  const { data } = await axiosInstance.post<{ data: EnquiryReply }>(
    storePath(storeId, `/enquiries/${enquiryId}/replies/${replyId}/resend`),
  );
  return data.data;
}

// The page shows the error. A 409 means the reply is no longer failed, so it is loaded again.
export function useResendEnquiryReplyMutation(enquiryId: number) {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (replyId: number) => resendEnquiryReply(store.id, enquiryId, replyId),
    onSuccess: () => invalidateEnquiries(queryClient, store.id),
    onError: (error) => {
      if (isStatus(error, 409)) void invalidateEnquiries(queryClient, store.id);
    },
  });
}
