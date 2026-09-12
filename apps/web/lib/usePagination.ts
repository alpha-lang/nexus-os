'use client';

import { useState, useEffect, useMemo } from 'react';

export interface PaginationOptions {
  perPageDefault?: number;
  perPageOptions?: number[];
}

export function usePagination<T>(items: T[], options: PaginationOptions = {}) {
  const {
    perPageDefault = 12,
    perPageOptions = [12, 24, 48, 96],
  } = options;

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(perPageDefault);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, currentPage, perPage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  return {
    page: currentPage,
    setPage,
    perPage,
    setPerPage,
    perPageOptions,
    total,
    totalPages,
    pageItems,
    reset: () => setPage(1),
  };
}
