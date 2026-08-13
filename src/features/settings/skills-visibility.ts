import { createSetting } from "@/features/settings/create-setting";

const skillsVisible = createSetting("oct-show-skills", {
  defaultValue: true,
  parse: (stored) => stored === "1",
  serialize: (visible) => (visible ? "1" : "0"),
});

export function useSkillsVisibility() {
  const { value, setValue } = skillsVisible.useSetting();
  return { visible: value, setVisible: setValue };
}
