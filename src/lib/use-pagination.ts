import { useState } from "react";

/*
 * Client-side pagination state. The current page is clamped during render (no
 * effect), so swapping lists (tabs/views/search) can never leave the UI on a
 * dead page — callers reset() when the list identity changes.
 */
export function usePagination(total: number, pageSize: number) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  return {
    page: safePage,
    pageCount,
    setPage,
    reset: () => setPage(1),
    prev: () => setPage((p) => Math.max(1, p - 1)),
    next: () => setPage((p) => Math.min(pageCount, p + 1)),
  };
}
