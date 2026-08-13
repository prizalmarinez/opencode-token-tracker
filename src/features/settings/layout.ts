import { createSetting } from "@/features/settings/create-setting";

export type LayoutMode = "header" | "sidebar";

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

const layout = createSetting<LayoutMode>("oct-layout", {
  defaultValue: DEFAULT_LAYOUT,
  parse: (stored) =>
    (VALID as string[]).includes(stored)
      ? (stored as LayoutMode)
      : DEFAULT_LAYOUT,
  serialize: (mode) => mode,
});

export function useLayout() {
  const { value, setValue } = layout.useSetting();
  return { layout: value, setLayout: setValue };
}
