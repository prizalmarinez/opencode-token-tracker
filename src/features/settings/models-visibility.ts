import { useCallback, useSyncExternalStore } from "react";

export const MODELS_VISIBILITY_KEY = "oct-show-models";
export const DEFAULT_MODELS_VISIBLE = false;

export function getStoredModelsVisible(): boolean {
  try {
    const t = localStorage.getItem(MODELS_VISIBILITY_KEY);
    return t === null ? DEFAULT_MODELS_VISIBLE : t === "1";
  } catch {
    return DEFAULT_MODELS_VISIBLE;
  }
}

let current: boolean = getStoredModelsVisible();
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function setModelsVisible(visible: boolean) {
  if (visible === current) return;
  current = visible;
  try {
    localStorage.setItem(MODELS_VISIBILITY_KEY, visible ? "1" : "0");
  } catch {
    /* storage unavailable — setting still applies for the session */
  }
  listeners.forEach((l) => l());
}

export function useModelsVisibility() {
  const visible = useSyncExternalStore(
    useCallback((onChange) => subscribe(onChange), []),
    () => current,
  );
  return { visible, setVisible: setModelsVisible };
}
