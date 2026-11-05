import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { type OfferStatus } from '@/types/pricing';
import { type OfferListFilters } from '@/hooks/api/queryKeys';

const SEARCH_DEBOUNCE_MILLISECONDS = 300;
const OFFER_STATUSES: OfferStatus[] = ['live', 'scheduled', 'inactive', 'ended'];

export type OfferTab = OfferStatus | 'all';

function parsePositiveInteger(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : undefined;
}

export function useOfferListFilters() {
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
  // No (or an unknown) status in the URL means All, which sends no status to the API.
  const tab: OfferTab = OFFER_STATUSES.find((candidate) => candidate === statusParam) ?? 'all';
  const status = tab === 'all' ? undefined : tab;
  const page = parsePositiveInteger(searchParams.get('page'));

  const filters: OfferListFilters = useMemo(
    () => ({ status, search: urlSearch || undefined, page }),
    [status, urlSearch, page],
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
    tab,
    searchText,
    setTab: (nextTab: OfferTab) =>
      updateParams({ status: nextTab === 'all' ? undefined : nextTab }),
    setSearch: setSearchText,
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
