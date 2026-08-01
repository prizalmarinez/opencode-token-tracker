import type { OpencodeSession, OpencodeSummary, ServerStatus } from "@/types";

export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "http://localhost:3100";

function qs(dbPath?: string) {
  return dbPath && dbPath.trim()
    ? `&db=${encodeURIComponent(dbPath.trim())}`
    : "";
}

async function request<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`);
  } catch {
    throw new Error(
      `Cannot reach the API server at ${API_BASE}. Make sure it is running (\`pnpm dev\`), then retry.`,
    );
  }
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* keep fallback message */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export function getStatus(dbPath?: string) {
  return request<ServerStatus>(`/api/status${qs(dbPath)}`);
}

export function getSummary(dbPath?: string) {
  return request<OpencodeSummary>(`/api/summary${qs(dbPath)}`);
}

export function getSessions(dbPath?: string, limit = 50, offset = 0) {
  return request<OpencodeSession[]>(
    `/api/sessions?limit=${limit}&offset=${offset}${qs(dbPath)}`,
  );
}

export function getProjectSessions(
  dbPath: string | undefined,
  project: string,
  limit = 500,
  offset = 0,
) {
  return request<OpencodeSession[]>(
    `/api/sessions?project=${encodeURIComponent(project)}&limit=${limit}&offset=${offset}${qs(dbPath)}`,
  );
}

export async function getAllSessions(
  dbPath: string | undefined,
  project?: string,
  max = 10_000,
) {
  const rows: OpencodeSession[] = [];
  const pageSize = 500;
  let offset = 0;
  while (offset < max) {
    const page = project
      ? await getProjectSessions(dbPath, project, pageSize, offset)
      : await getSessions(dbPath, pageSize, offset);
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}
