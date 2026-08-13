import { createSetting } from "@/features/settings/create-setting";

const neuralNetVisible = createSetting("oct-show-neural-net", {
  defaultValue: false,
  parse: (stored) => stored === "1",
  serialize: (visible) => (visible ? "1" : "0"),
});

export function useNeuralNetVisibility() {
  const { value, setValue } = neuralNetVisible.useSetting();
  return { visible: value, setVisible: setValue };
}
