import { createSetting } from "@/features/settings/create-setting";

const searchVisible = createSetting("oct-show-search", {
  defaultValue: true,
  parse: (stored) => stored === "1",
  serialize: (visible) => (visible ? "1" : "0"),
});

export function useSearchVisibility() {
  const { value, setValue } = searchVisible.useSetting();
  return { visible: value, setVisible: setValue };
}
