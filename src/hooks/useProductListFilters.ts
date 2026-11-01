import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { type ProductStatus } from '@/types/catalogue';
import { type ProductListFilters } from '@/hooks/api/queryKeys';

const SEARCH_DEBOUNCE_MILLISECONDS = 300;
const PRODUCT_STATUSES: ProductStatus[] = ['draft', 'published', 'archived'];

function parsePositiveInteger(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : undefined;
}

export function useProductListFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') ?? '';
  const [searchText, setSearchText] = useState(urlSearch);
  const [previousUrlSearch, setPreviousUrlSearch] = useState(urlSearch);

  // Back/forward or a link changed the URL search: show it in the box.
  if (previousUrlSearch !== urlSearch) {
    setPreviousUrlSearch(urlSearch);
    setSearchText(urlSearch);
  }

  const statusParam = searchParams.get('status');
  const status = PRODUCT_STATUSES.find((candidate) => candidate === statusParam);
  const category = parsePositiveInteger(searchParams.get('category'));
  const page = parsePositiveInteger(searchParams.get('page'));

  const filters: ProductListFilters = useMemo(
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
    if (searchText === urlSearch) return undefined;
    const timer = setTimeout(
      () => updateParams({ search: searchText.trim() || undefined }, true),
      SEARCH_DEBOUNCE_MILLISECONDS,
    );
    return () => clearTimeout(timer);
  }, [searchText, urlSearch, updateParams]);

  return {
    filters,
    searchText,
    setStatus: (nextStatus?: ProductStatus) => updateParams({ status: nextStatus }),
    setSearch: setSearchText,
    setCategory: (nextCategory?: number) =>
      updateParams({ category: nextCategory ? String(nextCategory) : undefined }),
    setPage: (nextPage: number) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (nextPage > 1) next.set('page', String(nextPage));
        else next.delete('page');
        return next;
      });
    },
  };
}
