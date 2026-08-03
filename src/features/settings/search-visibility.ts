import { useCallback, useSyncExternalStore } from "react";

export const SEARCH_VISIBILITY_KEY = "oct-show-search";
export const DEFAULT_SEARCH_VISIBLE = true;

export function getStoredSearchVisible(): boolean {
  try {
    const t = localStorage.getItem(SEARCH_VISIBILITY_KEY);
    return t === null ? DEFAULT_SEARCH_VISIBLE : t === "1";
  } catch {
    return DEFAULT_SEARCH_VISIBLE;
  }
}

let current: boolean = getStoredSearchVisible();
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function setSearchVisible(visible: boolean) {
  if (visible === current) return;
  current = visible;
  try {
    localStorage.setItem(SEARCH_VISIBILITY_KEY, visible ? "1" : "0");
  } catch {
    /* storage unavailable — setting still applies for the session */
  }
  listeners.forEach((l) => l());
}

export function useSearchVisibility() {
  const visible = useSyncExternalStore(
    useCallback((onChange) => subscribe(onChange), []),
    () => current,
  );
  return { visible, setVisible: setSearchVisible };
}
