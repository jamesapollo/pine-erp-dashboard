import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Outlet } from 'react-router-dom';

import { queryKeys } from '@/hooks/api/queryKeys';
import { setUnauthenticatedHandler } from '@/utils/axiosConfig';

export function App() {
  const queryClient = useQueryClient();

  useEffect(() => {
    setUnauthenticatedHandler(() => queryClient.setQueryData(queryKeys.me, null));
  }, [queryClient]);

  return <Outlet />;
}
