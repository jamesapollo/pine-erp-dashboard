import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { routes } from '@/Router';

export function buildTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        staleTime: Infinity,
      },
    },
  });
}

export function customRender(children: ReactNode) {
  const queryClient = buildTestQueryClient();
  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>),
  };
}

export function customRenderAtRoute({ url }: { url: string }) {
  const queryClient = buildTestQueryClient();
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  return {
    router,
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
}
