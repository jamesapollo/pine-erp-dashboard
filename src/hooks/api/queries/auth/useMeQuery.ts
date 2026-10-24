import { queryOptions, useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { queryKeys } from '@/hooks/api/queryKeys';
import { type User } from '@/types/session';
import { axiosInstance } from '@/utils/axiosConfig';

export async function getMe(): Promise<User | null> {
  try {
    const { data } = await axiosInstance.get<{ data: User }>('/api/v1/me');
    return data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) return null;
    throw error;
  }
}

export function meQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.me,
    queryFn: getMe,
  });
}

export function useMeQuery() {
  return useQuery(meQueryOptions());
}
