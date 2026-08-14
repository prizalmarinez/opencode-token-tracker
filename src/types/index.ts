/*
 * Wire shapes. These mirror the SQL aliases in server/query.mjs — the query
 * module is the source of truth for field names and units (all timestamps are
 * milliseconds). If you rename a column there, rename it here too.
 */

export interface OpencodeSession {
  id: string;
  timeCreated: number;
  title: string;
  modelId: string;
  providerId: string | null;
  variant: string | null;
  agent: string;
  directory: string;
  projectName: string | null;
  projectDir: string | null;
  cost: number;
  tokensInput: number;
  tokensOutput: number;
  tokensReasoning: number;
  tokensCacheRead: number;
  tokensCacheWrite: number;
}

export interface SessionsPage {
  sessions: OpencodeSession[];
  total: number;
}

export interface OpencodeSummary {
  exportedAt: string;
  dateRange: { from: number; to: number } | null;
  totals: {
    sessions: number;
    cost: number;
    tokensInput: number;
    tokensOutput: number;
    tokensReasoning: number;
    tokensCacheRead: number;
    tokensCacheWrite: number;
  };
  daily: {
    date: string;
    cost: number;
    sessions: number;
    input: number;
    output: number;
    reasoning: number;
  }[];
  byModel: {
    modelId: string;
    cost: number;
    count: number;
    input: number;
    output: number;
    reasoning: number;
  }[];
  byAgent: {
    agent: string;
    cost: number;
    count: number;
  }[];
  byProject: {
    name: string;
    cost: number;
    count: number;
  }[];
}

export interface ServerStatus {
  ok: boolean;
  dbPath: string;
  sessionCount: number;
  dbSize: number | null;
}

export interface OpencodeHealth {
  ok: boolean;
  latencyMs: number | null;
  checkedAt: string;
  error?: string;
}

export interface ProjectOverview {
  name: string;
  sessions: number;
  cost: number;
  tokens: number;
  firstMs: number;
  lastMs: number;
  totalDurationMs: number;
  avgDurationMs: number;
  avgCost: number;
}

export type SkillsView = "all-time" | "trending" | "hot";

export interface SkillsSkill {
  id: string;
  source: string;
  slug: string;
  name: string;
  rank: number | null;
  installs: string;
  installsRaw: number | null;
  url: string;
  installUrl: string | null;
}

export interface SkillsLeaderboard {
  view: SkillsView;
  skills: SkillsSkill[];
  fetchedAt: string;
}

export interface SkillsSearchResult {
  query: string;
  searchType: "fuzzy" | "semantic";
  count: number;
  skills: SkillsSkill[];
}

export interface InstalledSkills {
  names: string[];
}

export type ModelsSort =
  "top-weekly" | "pricing-low-to-high" | "context-high-to-low";

export interface ModelRow {
  id: string;
  name: string;
  contextLength: number | null;
  promptPrice: number | null;
  completionPrice: number | null;
  inputCacheReadPrice: number | null;
  isFree: boolean;
  arenaRank: number | null;
  arenaCategory: string | null;
  arenaElo: number | null;
  url: string;
}

export interface ModelsLeaderboard {
  sort: ModelsSort;
  models: ModelRow[];
  fetchedAt: string;
}

export type GoUsageWindowStatus = "ok" | "rate-limited";

export interface GoUsageWindow {
  status: GoUsageWindowStatus;
  percent: number | null;
  resetsAt: string | null;
}

export interface GoUsage {
  limits: { rolling: number; weekly: number; monthly: number };
  usage: {
    rolling: GoUsageWindow | null;
    weekly: GoUsageWindow | null;
    monthly: GoUsageWindow | null;
  };
  fetchedAt: string;
}
