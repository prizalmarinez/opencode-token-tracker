import {
  useEffect,
  useState,
  useSyncExternalStore,
  type DependencyList,
} from "react";

export interface QueryState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/*
 * One fetch lifecycle shared by every page: refetch when deps change,
 * cancel on unmount, per-query error/loading. The fetcher closes over the
 * caller's props; it must include every prop it reads in deps so the effect
 * re-runs with a fresh closure.
 */
export function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList,
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      trackActive(true);
      try {
        const value = await fetcher();
        if (cancelled) return;
        setData(value);
      } catch (e) {
        if (cancelled) return;
        setError(String(e instanceof Error ? e.message : e));
        setData(null);
      } finally {
        trackActive(false);
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading };
}

let activeQueries = 0;
const loadingListeners = new Set<() => void>();

function trackActive(starting: boolean) {
  const before = activeQueries > 0;
  activeQueries += starting ? 1 : -1;
  const after = activeQueries > 0;
  if (before !== after) for (const l of loadingListeners) l();
}

/** True while any useQuery is in flight — drives the nav refresh spinner. */
export function useAnyQueryLoading(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      loadingListeners.add(onChange);
      return () => loadingListeners.delete(onChange);
    },
    () => activeQueries > 0,
  );
}
