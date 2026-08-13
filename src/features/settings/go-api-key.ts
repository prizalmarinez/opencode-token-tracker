import { useCallback, useState } from "react";

/*
 * OpenCode Go API key, stored in the browser. Sent to the local API server as
 * X-OpenCode-Go-Key (never in a URL); the server falls back to the
 * OPENCODE_GO_API_KEY env var when the field is empty. Mirrors the theme/layout
 * settings pattern: localStorage-backed, session-safe fallback.
 */
export const GO_API_KEY_STORAGE_KEY = "oct-go-api-key";

export function getStoredGoApiKey(): string {
  try {
    return localStorage.getItem(GO_API_KEY_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function useGoApiKey() {
  const [key, setKeyState] = useState<string>(getStoredGoApiKey);

  const setKey = useCallback((value: string) => {
    setKeyState(value);
    try {
      localStorage.setItem(GO_API_KEY_STORAGE_KEY, value);
    } catch {
      /* storage unavailable — key still applies for the session */
    }
  }, []);

  return { key, setKey };
}
