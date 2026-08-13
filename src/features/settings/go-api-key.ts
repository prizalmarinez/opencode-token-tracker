import { createSetting } from "@/features/settings/create-setting";

/*
 * OpenCode Go API key, stored in the browser. Sent to the local API server as
 * X-OpenCode-Go-Key (never in a URL); the server falls back to the
 * OPENCODE_GO_API_KEY env var when the field is empty. Backed by the shared
 * setting store, so the usage page picks up key changes made in Settings.
 */
const goApiKey = createSetting("oct-go-api-key", {
  defaultValue: "",
  parse: (stored) => stored,
  serialize: (value) => value,
});

export function useGoApiKey() {
  const { value, setValue } = goApiKey.useSetting();
  return { key: value, setKey: setValue };
}
