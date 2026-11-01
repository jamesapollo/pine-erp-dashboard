import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { type StockListFilters, type StockStatusFilter } from '@/hooks/api/queryKeys';

const SEARCH_DEBOUNCE_MILLISECONDS = 300;
const STOCK_STATUSES: StockStatusFilter[] = ['low', 'out'];

function parsePositiveInteger(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : undefined;
}

/** The stock list's status tab, search, category and page, kept in the URL search params. */
export function useStockListFilters() {
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
  const status = STOCK_STATUSES.find((candidate) => candidate === statusParam);
  const category = parsePositiveInteger(searchParams.get('category'));
  const page = parsePositiveInteger(searchParams.get('page'));

  const filters: StockListFilters = useMemo(
    () => ({ status, search: urlSearch || undefined, category, page }),
    [status, urlSearch, category, page],
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
    setStatus: (nextStatus?: StockStatusFilter) => updateParams({ status: nextStatus }),
    setSearch: setSearchText,
    setCategory: (categoryId?: number) =>
      updateParams({ category: categoryId ? String(categoryId) : undefined }),
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
