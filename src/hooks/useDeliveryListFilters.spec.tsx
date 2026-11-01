import { type ReactNode } from 'react';
import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { useDeliveryListFilters } from '@/hooks/useDeliveryListFilters';

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
  const { result } = renderHook(() => useDeliveryListFilters(), { wrapper });
  return { result, search: () => screen.getByTestId('search').textContent };
}

describe('useDeliveryListFilters', () => {
  it('ignores an invalid status and a non-numeric courier', () => {
    const { result } = renderAt('/deliveries?status=bogus&courier=abc');
    expect(result.current.filters.status).toBeUndefined();
    expect(result.current.filters.courierId).toBeUndefined();
  });

  it('reads the filters from the URL', () => {
    const { result } = renderAt('/deliveries?status=in_transit&q=ZN-1&courier=4&page=2');
    expect(result.current.filters).toEqual({
      status: 'in_transit',
      search: 'ZN-1',
      courierId: 4,
      page: 2,
    });
  });

  it('sends typing to q after 300 ms and drops the page', async () => {
    const { result, search } = renderAt('/deliveries?page=3');
    act(() => result.current.setSearch('ZN'));
    await waitFor(() => expect(search()).toBe('?q=ZN'));
  });

  it('sets the courier and the status', async () => {
    const { result, search } = renderAt('/deliveries');
    act(() => result.current.setCourierId(7));
    await waitFor(() => expect(search()).toBe('?courier=7'));
    act(() => result.current.setStatus('failed'));
    await waitFor(() => expect(search()).toBe('?courier=7&status=failed'));
  });

  it('clear drops the search and the courier but keeps the status', async () => {
    const { result, search } = renderAt('/deliveries?status=failed&q=ZN&courier=7&page=2');
    act(() => result.current.clear());
    await waitFor(() => expect(search()).toBe('?status=failed'));
    expect(result.current.searchText).toBe('');
  });
});
