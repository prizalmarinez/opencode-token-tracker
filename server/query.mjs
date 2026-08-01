import { statSync } from "node:fs";

process.on("warning", (w) => {
  if (
    w.name === "ExperimentalWarning" &&
    w.message.toLowerCase().includes("sqlite")
  )
    return;
  console.warn(w);
});

const { DatabaseSync } = await import("node:sqlite");

/*
 * Query module. Owns everything that reads opencode.db:
 *   - the session_base TEMP VIEW (the only place the opencode schema is coupled)
 *   - STMT_SQL: prepared statements for every aggregation and listing
 *   - the per-path read-only connection cache
 *
 * Scoped variants (WHERE project_name_key = ?) are derived mechanically from
 * the base statements so the aggregation logic is defined once, not twice.
 * Model parsing (opencode stores `model` as a bare string or a JSON blob like
 * {"id":"...","providerID":"...","variant":"..."}) is pushed into SQL via
 * json_valid/json_extract, so aggregation statements only stream their tiny
 * result rows instead of shipping the whole session table to JS.
 */
const BASE_VIEW_SQL = `
CREATE TEMP VIEW IF NOT EXISTS session_base AS
SELECT
  s.id,
  s.time_created,
  s.title,
  s.model,
  s.agent,
  s.directory,
  s.cost,
  s.tokens_input,
  s.tokens_output,
  s.tokens_reasoning,
  s.tokens_cache_read,
  s.tokens_cache_write,
  p.name     AS project_name,
  p.worktree AS project_dir,
  CASE
    WHEN s.model IS NULL OR s.model = '' THEN 'unknown'
    WHEN json_valid(s.model) THEN COALESCE(json_extract(s.model, '$.id'), s.model)
    ELSE s.model
  END AS model_id,
  CASE WHEN json_valid(s.model) THEN json_extract(s.model, '$.providerID') END AS provider_id,
  CASE WHEN json_valid(s.model) THEN json_extract(s.model, '$.variant') END AS variant,
  COALESCE(NULLIF(s.agent, ''), 'unknown') AS agent_name,
  COALESCE(p.name, s.directory, 'unknown') AS project_name_key,
  -- the one place epoch units are decided: opencode may store ms or s.
  CASE WHEN s.time_created < 100000000000 THEN s.time_created * 1000 ELSE s.time_created END AS time_created_ms,
  strftime(
    '%Y-%m-%d',
    CAST(
      CASE WHEN s.time_created < 100000000000 THEN s.time_created * 1000 ELSE s.time_created END
      / 1000 AS INTEGER
    ),
    'unixepoch'
  ) AS date_key
FROM session s
LEFT JOIN project p ON p.id = s.project_id
WHERE s.cost IS NOT NULL AND s.time_created > 0
`;

const STMT_SQL = {
  count: "SELECT COUNT(*) AS n FROM session_base",
  totals: `
    SELECT
      COUNT(*) AS sessions,
      COALESCE(SUM(cost), 0) AS cost,
      COALESCE(SUM(tokens_input), 0) AS tokensInput,
      COALESCE(SUM(tokens_output), 0) AS tokensOutput,
      COALESCE(SUM(tokens_reasoning), 0) AS tokensReasoning,
      COALESCE(SUM(tokens_cache_read), 0) AS tokensCacheRead,
      COALESCE(SUM(tokens_cache_write), 0) AS tokensCacheWrite
    FROM session_base`,
  daily: `
    SELECT date_key AS date, COUNT(*) AS sessions,
      COALESCE(SUM(cost), 0) AS cost,
      COALESCE(SUM(tokens_input), 0) AS input,
      COALESCE(SUM(tokens_output), 0) AS output,
      COALESCE(SUM(tokens_reasoning), 0) AS reasoning
    FROM session_base
    GROUP BY date_key
    ORDER BY date_key`,
  byModel: `
    SELECT model_id AS modelId, COUNT(*) AS count, COALESCE(SUM(cost), 0) AS cost,
      COALESCE(SUM(tokens_input), 0) AS input,
      COALESCE(SUM(tokens_output), 0) AS output,
      COALESCE(SUM(tokens_reasoning), 0) AS reasoning
    FROM session_base
    GROUP BY model_id
    ORDER BY (SUM(tokens_input) + SUM(tokens_output) + SUM(tokens_reasoning)) DESC`,
  byAgent: `
    SELECT agent_name AS agent, COUNT(*) AS count, COALESCE(SUM(cost), 0) AS cost
    FROM session_base
    GROUP BY agent_name
    ORDER BY cost DESC`,
  byProject: `
    SELECT project_name_key AS name, COUNT(*) AS count, COALESCE(SUM(cost), 0) AS cost
    FROM session_base
    GROUP BY project_name_key
    ORDER BY cost DESC`,
  dateRange: `
    SELECT MIN(time_created_ms) AS min, MAX(time_created_ms) AS max
    FROM session_base`,
  sessions: `
    SELECT id, time_created_ms AS timeCreated, title, agent, directory, cost,
      tokens_input AS tokensInput, tokens_output AS tokensOutput,
      tokens_reasoning AS tokensReasoning,
      tokens_cache_read AS tokensCacheRead,
      tokens_cache_write AS tokensCacheWrite,
      project_name_key AS projectName, project_dir AS projectDir,
      model_id AS modelId, provider_id AS providerId, variant
    FROM session_base
    ORDER BY time_created DESC
    LIMIT ? OFFSET ?`,
  sessionsByProject: `
    SELECT id, time_created_ms AS timeCreated, title, agent, directory, cost,
      tokens_input AS tokensInput, tokens_output AS tokensOutput,
      tokens_reasoning AS tokensReasoning,
      tokens_cache_read AS tokensCacheRead,
      tokens_cache_write AS tokensCacheWrite,
      project_name_key AS projectName, project_dir AS projectDir,
      model_id AS modelId, provider_id AS providerId, variant
    FROM session_base
    WHERE project_name_key = ?
    ORDER BY time_created DESC
    LIMIT ? OFFSET ?`,
};

// Statements that aggregate and accept a project scope.
const SCOPABLE = [
  "totals",
  "daily",
  "byModel",
  "byAgent",
  "byProject",
  "dateRange",
];

const SCOPE_MARK = "FROM session_base";

function scopedVariant(sql) {
  const scoped = sql.replace(
    SCOPE_MARK,
    `${SCOPE_MARK} WHERE project_name_key = ?`,
  );
  if (scoped === sql)
    throw new Error(
      `cannot derive scoped variant, missing '${SCOPE_MARK}' in: ${sql}`,
    );
  return scoped;
}

// path -> { db, stmts } — one read-only connection + prepared statements per db
const dbCache = new Map();

export function getOpen(path) {
  const cached = dbCache.get(path);
  if (cached) return cached;

  try {
    statSync(path);
  } catch {
    return { error: `opencode.db not found at ${path}` };
  }

  let db;
  try {
    db = new DatabaseSync(path, { readOnly: true });
  } catch (err) {
    return { error: `Cannot open database: ${err.message}` };
  }

  let cols;
  try {
    cols = db
      .prepare("PRAGMA table_info(session)")
      .all()
      .map((r) => r.name);
  } catch (err) {
    db.close();
    return { error: "cannot read session table" };
  }
  if (!cols.includes("cost")) {
    db.close();
    return { error: "session table missing cost column" };
  }

  try {
    db.exec(BASE_VIEW_SQL);
  } catch (err) {
    db.close();
    return { error: `schema mismatch: ${err.message}` };
  }

  const stmts = {};
  for (const [name, sql] of Object.entries(STMT_SQL))
    stmts[name] = db.prepare(sql);
  for (const name of SCOPABLE)
    stmts[`${name}Scoped`] = db.prepare(scopedVariant(STMT_SQL[name]));

  dbCache.set(path, { db, stmts });
  return { db, stmts };
}

export function closeAll() {
  for (const { db } of dbCache.values()) {
    try {
      db.close();
    } catch {}
  }
  dbCache.clear();
}

function run(stmts, name, mode, scope) {
  const stmt = scope ? stmts[`${name}Scoped`] : stmts[name];
  const params = scope ? [scope] : [];
  return mode === "get" ? stmt.get(...params) : stmt.all(...params);
}

export function queryStatus(stmts, dbPath) {
  const { n } = stmts.count.get();
  let dbSize = null;
  try {
    dbSize = statSync(dbPath).size;
  } catch {}
  return { ok: true, sessionCount: n, dbSize };
}

export function querySummary(stmts, scope) {
  const range = run(stmts, "dateRange", "get", scope);
  return {
    exportedAt: new Date().toISOString(),
    dateRange:
      range && range.min != null && range.max != null
        ? { from: range.min, to: range.max }
        : null,
    totals: run(stmts, "totals", "get", scope),
    daily: run(stmts, "daily", "all", scope),
    byModel: run(stmts, "byModel", "all", scope),
    byAgent: run(stmts, "byAgent", "all", scope),
    byProject: run(stmts, "byProject", "all", scope),
  };
}

export function querySessions(stmts, { project, limit, offset }) {
  if (project != null && project.trim() !== "")
    return stmts.sessionsByProject.all(project, limit, offset);
  return stmts.sessions.all(limit, offset);
}
