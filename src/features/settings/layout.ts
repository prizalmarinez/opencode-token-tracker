import { useCallback, useSyncExternalStore } from "react";

export type LayoutMode = "header" | "sidebar";

export const LAYOUT_KEY = "oct-layout";
export const DEFAULT_LAYOUT: LayoutMode = "header";

const VALID: LayoutMode[] = ["header", "sidebar"];

export interface LayoutOption {
  id: LayoutMode;
  name: string;
  icon: "PanelTop" | "PanelLeft";
}

export const LAYOUTS: LayoutOption[] = [
  { id: "header", name: "header", icon: "PanelTop" },
  { id: "sidebar", name: "sidebar", icon: "PanelLeft" },
];

export function getStoredLayout(): LayoutMode {
  try {
    const t = localStorage.getItem(LAYOUT_KEY);
    return t && (VALID as string[]).includes(t)
      ? (t as LayoutMode)
      : DEFAULT_LAYOUT;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

let current: LayoutMode = getStoredLayout();
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function setLayout(mode: LayoutMode) {
  if (mode === current) return;
  current = mode;
  try {
    localStorage.setItem(LAYOUT_KEY, mode);
  } catch {
    /* storage unavailable — layout still applies for the session */
  }
  listeners.forEach((l) => l());
}

export function useLayout() {
  const layout = useSyncExternalStore(
    useCallback((onChange) => subscribe(onChange), []),
    () => current,
  );
  return { layout, setLayout };
}
