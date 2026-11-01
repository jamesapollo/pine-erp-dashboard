import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { type DeliveryStatus } from '@/types/sales';
import { type DeliveryListFilters } from '@/hooks/api/queryKeys';

const SEARCH_DEBOUNCE_MILLISECONDS = 300;
const DELIVERY_STATUSES: DeliveryStatus[] = [
  'preparing',
  'dispatched',
  'in_transit',
  'delivered',
  'failed',
  'returned',
  'cancelled',
];

function parsePositiveInteger(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : undefined;
}

export function useDeliveryListFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('q') ?? '';
  const [searchText, setSearchText] = useState(urlSearch);
  const [previousUrlSearch, setPreviousUrlSearch] = useState(urlSearch);

  // Back/forward or a link changed the URL search: show it in the box.
  if (previousUrlSearch !== urlSearch) {
    setPreviousUrlSearch(urlSearch);
    setSearchText(urlSearch);
  }

  const statusParam = searchParams.get('status');
  const status = DELIVERY_STATUSES.find((candidate) => candidate === statusParam);
  const courierId = parsePositiveInteger(searchParams.get('courier'));
  const page = parsePositiveInteger(searchParams.get('page'));

  const filters: DeliveryListFilters = useMemo(
    () => ({ status, search: urlSearch || undefined, courierId, page }),
    [status, urlSearch, courierId, page],
  );

  const updateParams = useCallback(
    (changes: Record<string, string | undefined>, shouldReplace = false) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete('page');
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: shouldReplace },
      );
    },
    [setSearchParams],
  );

  // Typing waits 300 ms of quiet before it reaches the URL (and so the request).
  useEffect(() => {
    if (searchText.trim() === urlSearch) return undefined;
    const timer = setTimeout(
      () => updateParams({ q: searchText.trim() || undefined }, true),
      SEARCH_DEBOUNCE_MILLISECONDS,
    );
    return () => clearTimeout(timer);
  }, [searchText, urlSearch, updateParams]);

  return {
    filters,
    searchText,
    setStatus: (nextStatus?: DeliveryStatus) => updateParams({ status: nextStatus }),
    setSearch: setSearchText,
    setCourierId: (nextCourierId?: number) =>
      updateParams({ courier: nextCourierId ? String(nextCourierId) : undefined }),
    // Drops the search and the courier; the status tab stays.
    clear: () => {
      setSearchText('');
      updateParams({ q: undefined, courier: undefined });
    },
    setPage: (nextPage: number, shouldReplace = false) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (nextPage > 1) next.set('page', String(nextPage));
          else next.delete('page');
          return next;
        },
        { replace: shouldReplace },
      );
    },
  };
}
