import { queryOptions, useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { type InvitationPreview } from '@/types/staff';
import { queryKeys } from '@/hooks/api/queryKeys';
import { axiosInstance } from '@/utils/axiosConfig';

// Any link that does not work (unknown, used, expired, revoked) is a 404: there is no invite to show.
export async function getInvitation(token: string): Promise<InvitationPreview | null> {
  try {
    const { data } = await axiosInstance.get<{ data: InvitationPreview }>(
      `/api/v1/invitations/${encodeURIComponent(token)}`,
    );
    return data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export function invitationQueryOptions(token: string) {
  return queryOptions({
    queryKey: queryKeys.invitation(token),
    queryFn: () => getInvitation(token),
  });
}

export function useInvitationQuery(token: string | null) {
  return useQuery({
    ...invitationQueryOptions(token ?? ''),
    enabled: token !== null && token !== '',
  });
}
