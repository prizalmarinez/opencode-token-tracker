const KEY = "oct-collapsed-messages";

type CollapsedMap = Record<string, string[]>;

function read(): CollapsedMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as CollapsedMap;
  } catch {
    return {};
  }
}

export function isMessageCollapsed(
  sessionId: string,
  messageId: string,
): boolean {
  return read()[sessionId]?.includes(messageId) ?? false;
}

export function setMessageCollapsed(
  sessionId: string,
  messageId: string,
  collapsed: boolean,
): void {
  const map = read();
  const list = map[sessionId] ?? [];
  const next = collapsed
    ? [...new Set([...list, messageId])]
    : list.filter((id) => id !== messageId);
  if (next.length > 0) map[sessionId] = next;
  else delete map[sessionId];
  localStorage.setItem(KEY, JSON.stringify(map));
}
