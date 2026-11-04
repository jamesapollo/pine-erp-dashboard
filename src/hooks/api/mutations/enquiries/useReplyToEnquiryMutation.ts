import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type EnquiryReply } from '@/types/enquiry';
import { invalidateEnquiries } from '@/hooks/api/mutations/enquiries/invalidateEnquiries';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { axiosInstance } from '@/utils/axiosConfig';
import { storePath } from '@/utils/storePath';

export type ReplyToEnquiryMutationParams = { body: string };

export async function replyToEnquiry(
  storeId: number,
  enquiryId: number,
  body: ReplyToEnquiryMutationParams,
): Promise<EnquiryReply> {
  const { data } = await axiosInstance.post<{ data: EnquiryReply }>(
    storePath(storeId, `/enquiries/${enquiryId}/replies`),
    body,
  );
  return data.data;
}

// The reply form shows the error and keeps what was typed.
export function useReplyToEnquiryMutation(enquiryId: number) {
  const { store } = useAuthedSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: ReplyToEnquiryMutationParams) =>
      replyToEnquiry(store.id, enquiryId, params),
    onSuccess: () => invalidateEnquiries(queryClient, store.id),
  });
}
