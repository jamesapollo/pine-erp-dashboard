import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Outlet } from 'react-router-dom';

import { queryKeys } from '@/hooks/api/queryKeys';
import { setUnauthenticatedHandler } from '@/utils/axiosConfig';

export function App() {
  const queryClient = useQueryClient();

  useEffect(() => {
    setUnauthenticatedHandler(() => {
      // Drop every cached query except the live session one, so mounted observers
      // stay attached and see the signed-out state.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.me[0] });
      queryClient.setQueryData(queryKeys.me, null);
    });
  }, [queryClient]);

  return <Outlet />;
}
