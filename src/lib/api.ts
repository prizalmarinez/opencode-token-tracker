import type {
  InstalledSkills,
  OpencodeHealth,
  OpencodeSession,
  OpencodeSummary,
  ProjectOverview,
  ServerStatus,
  SkillsLeaderboard,
  SkillsSearchResult,
  SkillsView,
} from "@/types";

export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "http://localhost:3100";

// Keep ≤ MAX_LIMIT in server/index.mjs — the server caps each page at 500.
export const PAGE_SIZE = 500;

function buildPath(
  path: string,
  params: Record<string, string | number | undefined>,
) {
  const search = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
  return search ? `${path}?${search}` : path;
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
  return request<ServerStatus>(buildPath("/api/status", { db: dbPath }));
}

export function getOpencodeHealth() {
  return request<OpencodeHealth>("/api/opencode-health");
}

export function getSummary(dbPath?: string, project?: string) {
  return request<OpencodeSummary>(
    buildPath("/api/summary", { db: dbPath, project }),
  );
}

export function getProjects(dbPath?: string, project?: string) {
  return request<ProjectOverview[]>(
    buildPath("/api/projects", { db: dbPath, project }),
  );
}

export function getSessions(dbPath?: string, limit = 50, offset = 0) {
  return request<OpencodeSession[]>(
    buildPath("/api/sessions", { db: dbPath, limit, offset }),
  );
}

export function getProjectSessions(
  dbPath: string | undefined,
  project: string,
  limit = 500,
  offset = 0,
) {
  return request<OpencodeSession[]>(
    buildPath("/api/sessions", { db: dbPath, project, limit, offset }),
  );
}

export async function getAllSessions(
  dbPath: string | undefined,
  project?: string,
  max = 10_000,
) {
  const rows: OpencodeSession[] = [];
  let offset = 0;
  while (offset < max) {
    const page = project
      ? await getProjectSessions(dbPath, project, PAGE_SIZE, offset)
      : await getSessions(dbPath, PAGE_SIZE, offset);
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

export function getSkillsLeaderboard(view: SkillsView = "all-time") {
  return request<SkillsLeaderboard>(
    buildPath("/api/skills/leaderboard", { view }),
  );
}

export function searchSkills(q: string) {
  return request<SkillsSearchResult>(buildPath("/api/skills/search", { q }));
}

export function getInstalledSkills() {
  return request<InstalledSkills>("/api/skills/installed");
}
