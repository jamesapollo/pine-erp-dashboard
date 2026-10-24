import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { type ReactNode } from 'react';

import { useSession } from '@/hooks/useSession';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';
import { buildTestQueryClient } from '@/tests/customRender';

describe('useSession', () => {
  it('exposes the first membership once authed', async () => {
    server.use(http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })));
    const queryClient = buildTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('authed'));
    if (result.current.status !== 'authed') throw new Error('expected an authed session');
    expect(result.current.store.name).toBe('Zion');
    expect(result.current.roles).toEqual(['owner']);
    expect(result.current.hasPermission('orders.view')).toBe(true);
    expect(result.current.hasPermission('nope')).toBe(false);
  });
});
