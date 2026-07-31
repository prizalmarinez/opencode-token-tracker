import { useCallback, useState } from "react";

export interface Theme {
  id: string;
  name: string;
  swatch: string;
}

export const THEMES: Theme[] = [
  { id: "ember", name: "ember", swatch: "#ff7f1a" },
  { id: "phosphor", name: "phosphor", swatch: "#a3e635" },
  { id: "terminal", name: "terminal", swatch: "#35d07e" },
  { id: "aqua", name: "aqua", swatch: "#19c9b5" },
  { id: "violet", name: "violet", swatch: "#a78bfa" },
  { id: "rose", name: "rose", swatch: "#f472b6" },
];

export const THEME_KEY = "oct-theme";
export const DEFAULT_THEME = "ember";

export function getStoredTheme(): string {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t && THEMES.some((x) => x.id === t) ? t : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(id: string) {
  document.documentElement.dataset.theme = id;
}

export function useTheme() {
  const [theme, setTheme] = useState<string>(getStoredTheme);

  const changeTheme = useCallback((id: string) => {
    setTheme(id);
    applyTheme(id);
    try {
      localStorage.setItem(THEME_KEY, id);
    } catch {
      /* storage unavailable — theme still applies for the session */
    }
  }, []);

  return { theme, setTheme: changeTheme };
}
