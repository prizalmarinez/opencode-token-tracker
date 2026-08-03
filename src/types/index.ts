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
