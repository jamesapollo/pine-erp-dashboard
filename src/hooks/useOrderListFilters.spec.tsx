import { type ReactNode } from 'react';
import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { useOrderListFilters } from '@/hooks/useOrderListFilters';

function LocationSearch() {
  return <output data-testid="search">{useLocation().search}</output>;
}

function renderAt(url: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>
      <LocationSearch />
      {children}
    </MemoryRouter>
  );
  const { result } = renderHook(() => useOrderListFilters(), { wrapper });
  return { result, search: () => screen.getByTestId('search').textContent };
}

describe('useOrderListFilters', () => {
  it('ignores an invalid status', () => {
    const { result } = renderAt('/orders?status=bogus&page=2');
    expect(result.current.filters.status).toBeUndefined();
    expect(result.current.filters.page).toBe(2);
  });

  it('reads the search, status and pending fee from the URL', () => {
    const { result } = renderAt('/orders?status=pending&q=amina&fee=pending');
    expect(result.current.filters).toEqual({
      status: 'pending',
      search: 'amina',
      feePending: true,
      page: undefined,
    });
  });

  it('sends typing to q after 300 ms and drops the page', async () => {
    const { result, search } = renderAt('/orders?page=3');
    act(() => result.current.setSearch('amina'));
    expect(search()).toBe('?page=3');
    await waitFor(() => expect(search()).toBe('?q=amina'));
  });

  it('sets and clears the pending fee filter', async () => {
    const { result, search } = renderAt('/orders?page=2');
    act(() => result.current.setFeePending(true));
    await waitFor(() => expect(search()).toBe('?fee=pending'));
    act(() => result.current.setFeePending(false));
    await waitFor(() => expect(search()).toBe(''));
  });

  it('sets the status and the page', async () => {
    const { result, search } = renderAt('/orders');
    act(() => result.current.setStatus('confirmed'));
    await waitFor(() => expect(search()).toBe('?status=confirmed'));
    act(() => result.current.setPage(2));
    await waitFor(() => expect(search()).toBe('?status=confirmed&page=2'));
  });
});
