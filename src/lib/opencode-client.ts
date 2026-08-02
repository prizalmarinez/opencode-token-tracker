import { createOpencodeClient } from "@opencode-ai/sdk/client";
import { API_BASE } from "@/lib/api";

export const CHAT_PROXY_BASE = `${API_BASE}/api/chat`;

export const opencode = createOpencodeClient({ baseUrl: CHAT_PROXY_BASE });
