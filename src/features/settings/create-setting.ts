import { useCallback, useSyncExternalStore } from "react";

export interface SettingOptions<T> {
  defaultValue: T;
  parse: (stored: string) => T;
  serialize: (value: T) => string;
}

export interface Setting<T> {
  get: () => T;
  set: (value: T) => void;
  useSetting: () => { value: T; setValue: (value: T) => void };
}

/*
 * One localStorage-backed setting store: module-level value, listener set, and
 * a useSyncExternalStore hook so every component sees the same value — a
 * setting changed in one component re-renders all others. parse/serialize
 * preserve each setting's existing storage format ("1"/"0" booleans, raw
 * strings for keys and enums), so nothing stored before this module existed
 * needs migrating.
 */
export function createSetting<T>(
  key: string,
  { defaultValue, parse, serialize }: SettingOptions<T>,
): Setting<T> {
  function get(): T {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? defaultValue : parse(stored);
    } catch {
      return defaultValue;
    }
  }

  let current = get();
  const listeners = new Set<() => void>();

  function subscribe(onChange: () => void) {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  }

  function set(value: T) {
    if (value === current) return;
    current = value;
    try {
      localStorage.setItem(key, serialize(value));
    } catch {
      /* storage unavailable — setting still applies for the session */
    }
    listeners.forEach((l) => l());
  }

  function useSetting() {
    const value = useSyncExternalStore(
      useCallback((onChange) => subscribe(onChange), []),
      () => current,
    );
    return { value, setValue: set };
  }

  return { get, set, useSetting };
}
