import { useState, useCallback } from 'react';

export interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
  maxLimit?: number;
}

export interface UsePaginationReturn {
  page: number;
  limit: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  resetPagination: () => void;
  goToFirstPage: () => void;
  goToLastPage: (totalPages: number) => void;
  nextPage: (hasNext: boolean) => void;
  previousPage: (hasPrevious: boolean) => void;
}

export const usePagination = ({
  initialPage = 1,
  initialLimit = 20,
  maxLimit = 100,
}: UsePaginationOptions = {}): UsePaginationReturn => {
  const [page, setPageState] = useState(initialPage);
  const [limit, setLimitState] = useState(initialLimit);

  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, newPage));
  }, []);

  const setLimit = useCallback((newLimit: number) => {
    const validLimit = Math.max(1, Math.min(maxLimit, newLimit));
    setLimitState(validLimit);
    // Reset to first page when limit changes
    setPageState(1);
  }, [maxLimit]);

  const resetPagination = useCallback(() => {
    setPageState(initialPage);
    setLimitState(initialLimit);
  }, [initialPage, initialLimit]);

  const goToFirstPage = useCallback(() => {
    setPageState(1);
  }, []);

  const goToLastPage = useCallback((totalPages: number) => {
    setPageState(Math.max(1, totalPages));
  }, []);

  const nextPage = useCallback((hasNext: boolean) => {
    if (hasNext) {
      setPageState(prev => prev + 1);
    }
  }, []);

  const previousPage = useCallback((hasPrevious: boolean) => {
    if (hasPrevious) {
      setPageState(prev => Math.max(1, prev - 1));
    }
  }, []);

  return {
    page,
    limit,
    setPage,
    setLimit,
    resetPagination,
    goToFirstPage,
    goToLastPage,
    nextPage,
    previousPage,
  };
};

export default usePagination;
