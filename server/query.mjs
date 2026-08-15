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
 *
 * opencode 2 keeps sessions in a new `session_v2` table (same columns as the
 * legacy `session`). Its migration copies every legacy session into `session_v2`
 * (same id), so the union must exclude legacy ids that already exist there —
 * otherwise every migrated session is double-counted. Legacy rows with a
 * NULL/empty model are v2-era stub sessions (created empty by `opencode serve`,
 * never populated) — filtered on the outer WHERE so the guard covers both
 * branches (v2 carries the same empty stubs).
 */
const SESSION_ROW_COLS = `
  id, project_id, directory, title, model, agent, cost,
  tokens_input, tokens_output, tokens_reasoning, tokens_cache_read, tokens_cache_write,
  time_created, time_updated
`;

// withV2: union session_v2 (opencode 2) into the base. Pre-v2 DBs lack the
// table, so the view is built without it rather than failing on `no such table`.
// When it exists, v2 owns every id it holds (migration copied legacy rows 1:1),
// so the legacy branch only contributes ids v2 never migrated.
function baseViewSql(withV2) {
  return `
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
  CASE WHEN s.time_updated IS NULL OR s.time_updated <= 0 THEN NULL
       WHEN s.time_updated < 100000000000 THEN s.time_updated * 1000
       ELSE s.time_updated END AS time_updated_ms,
  -- duration_ms is normalized to the same epoch regime as time_created_ms.
  CASE WHEN s.time_updated IS NULL OR s.time_updated <= 0 THEN 0
       ELSE
         (CASE WHEN s.time_updated < 100000000000 THEN s.time_updated * 1000 ELSE s.time_updated END)
         - (CASE WHEN s.time_created < 100000000000 THEN s.time_created * 1000 ELSE s.time_created END)
  END AS duration_ms,
  strftime(
    '%Y-%m-%d',
    CAST(
      CASE WHEN s.time_created < 100000000000 THEN s.time_created * 1000 ELSE s.time_created END
      / 1000 AS INTEGER
    ),
    'unixepoch'
  ) AS date_key
FROM (
  SELECT${SESSION_ROW_COLS}
  FROM session
  ${
    withV2
      ? "WHERE NOT EXISTS (SELECT 1 FROM session_v2 WHERE session_v2.id = session.id)"
      : ""
  }
  ${
    withV2
      ? `UNION ALL
  SELECT${SESSION_ROW_COLS}
  FROM session_v2`
      : ""
  }
) s
LEFT JOIN project p ON p.id = s.project_id
WHERE s.cost IS NOT NULL AND s.time_created > 0
  AND s.model IS NOT NULL AND s.model != ''
`;
}

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
  byProjectOverview: `
    SELECT
      project_name_key AS name,
      COUNT(*) AS sessions,
      COALESCE(SUM(cost), 0) AS cost,
      COALESCE(SUM(tokens_input + tokens_output + tokens_reasoning), 0) AS tokens,
      MIN(time_created_ms) AS firstMs,
      MAX(time_created_ms) AS lastMs,
      COALESCE(SUM(duration_ms), 0) AS totalDurationMs,
      COALESCE(AVG(duration_ms), 0) AS avgDurationMs,
      CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(cost), 0) / COUNT(*) ELSE 0 END AS avgCost
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
      model_id AS modelId, provider_id AS providerId, variant,
      COUNT(*) OVER () AS total
    FROM session_base
    ORDER BY time_created DESC
    LIMIT ? OFFSET ?`,
  // Text search across the full history. Self-contained WHERE (project
  // scope + LIKE on title/project) — NOT in SCOPABLE, whose FROM-clause
  // injection would double the WHERE.
  sessionsSearch: `
    SELECT id, time_created_ms AS timeCreated, title, agent, directory, cost,
      tokens_input AS tokensInput, tokens_output AS tokensOutput,
      tokens_reasoning AS tokensReasoning,
      tokens_cache_read AS tokensCacheRead,
      tokens_cache_write AS tokensCacheWrite,
      project_name_key AS projectName, project_dir AS projectDir,
      model_id AS modelId, provider_id AS providerId, variant,
      COUNT(*) OVER () AS total
    FROM session_base
    WHERE (? IS NULL OR project_name_key = ?)
      AND (title LIKE '%' || ? || '%' OR project_name_key LIKE '%' || ? || '%')
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
  "byProjectOverview",
  "dateRange",
  "sessions",
];

/*
 * Per-thread size report for the chat page's threads. Every session the app
 * creates is titled 'chat' (older ones 'web search'/'deep research'), so the
 * title filter mirrors the localStorage registry in src/lib/use-chat-stream.ts
 * server-side. "Size" is the stored payload of that thread's rows: opencode 2
 * keeps everything in session_message.data, legacy opencode 1 in message.data
 * + part.data. length(CAST(x AS BLOB)) counts UTF-8 bytes, not characters.
 * v2-dependent pieces are spliced in like baseViewSql — pre-v2 DBs have no
 * session_v2/session_message tables, so the statement must not reference them.
 */
function chatThreadsSql(withV2) {
  const v2Rows = withV2
    ? `
    UNION ALL
    SELECT id, title, time_created FROM session_v2
    WHERE title IN ('chat', 'web search', 'deep research')`
    : "";
  const v2Sizes = withV2
    ? `
    LEFT JOIN (
      SELECT session_id, COUNT(*) AS n, SUM(length(CAST(data AS BLOB))) AS bytes
      FROM session_message
      GROUP BY session_id
    ) sm ON sm.session_id = s.id`
    : "";
  const v2Count = withV2 ? " + COALESCE(sm.n, 0)" : "";
  const v2Bytes = withV2 ? " + COALESCE(sm.bytes, 0)" : "";
  return `
SELECT
  s.id,
  COALESCE(s.title, 'chat') AS title,
  CASE WHEN s.time_created < 100000000000 THEN s.time_created * 1000 ELSE s.time_created END AS timeCreated,
  COALESCE(m.n, 0)${v2Count} AS messages,
  COALESCE(m.bytes, 0) + COALESCE(p.bytes, 0)${v2Bytes} AS bytes,
  COALESCE(t.questions, 0) AS questions,
  COALESCE(t.runMs, 0) AS runMs
FROM (
  SELECT id, title, time_created FROM session
  WHERE title IN ('chat', 'web search', 'deep research')
  ${
    withV2
      ? "AND NOT EXISTS (SELECT 1 FROM session_v2 WHERE session_v2.id = session.id)"
      : ""
  }${v2Rows}
) s${v2Sizes}
LEFT JOIN (
  SELECT session_id, COUNT(*) AS n, SUM(length(CAST(data AS BLOB))) AS bytes
  FROM message
  GROUP BY session_id
) m ON m.session_id = s.id
LEFT JOIN (
  SELECT session_id, SUM(length(CAST(data AS BLOB))) AS bytes
  FROM part
  GROUP BY session_id
) p ON p.session_id = s.id
LEFT JOIN (${threadTimingSql(withV2)}) t ON t.session_id = s.id
WHERE COALESCE(m.n, 0)${v2Count} > 0
ORDER BY COALESCE(t.runMs, 0) DESC,
  (COALESCE(m.bytes, 0) + COALESCE(p.bytes, 0))${v2Bytes} DESC`;
}

/*
 * Thinking time per thread: how long the agent actually ran per question.
 * A turn starts at a user message and ends when the last assistant message of
 * that turn is updated — so runMs sums (turn end − question created) across
 * turns, and questions counts the turns. opencode 2 orders by seq and marks
 * roles in `type`; legacy opencode 1 orders by time_created/rowid and marks
 * roles in data.role JSON. Synthetic/system/compaction messages are excluded
 * (they'd invent turns that were never questions).
 */
function threadTimingSql(withV2) {
  const v2Turns = withV2
    ? `
    SELECT session_id,
      CASE WHEN MAX(time_updated) > MIN(time_created)
        THEN MAX(time_updated) - MIN(time_created) ELSE 0 END AS dur
    FROM (
      SELECT session_id,
        SUM(CASE WHEN type = 'user' THEN 1 ELSE 0 END)
          OVER (PARTITION BY session_id ORDER BY seq) AS turn,
        time_created, time_updated
      FROM session_message
      WHERE type IN ('user', 'assistant')
    )
    GROUP BY session_id, turn
    UNION ALL
`
    : "";
  return `
  SELECT session_id, COUNT(*) AS questions, SUM(dur) AS runMs
  FROM (
    ${v2Turns}SELECT session_id,
      CASE WHEN MAX(time_updated) > MIN(time_created)
        THEN MAX(time_updated) - MIN(time_created) ELSE 0 END AS dur
    FROM (
      SELECT session_id,
        SUM(CASE WHEN json_extract(data, '$.role') = 'user' THEN 1 ELSE 0 END)
          OVER (PARTITION BY session_id ORDER BY time_created, rowid) AS turn,
        time_created, time_updated
      FROM message
      WHERE json_extract(data, '$.role') IN ('user', 'assistant')
    )
    GROUP BY session_id, turn
  )
  GROUP BY session_id`;
}

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

  const hasV2 =
    db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'session_v2'",
      )
      .get() !== undefined;

  try {
    db.exec(baseViewSql(hasV2));
  } catch (err) {
    db.close();
    return { error: `schema mismatch: ${err.message}` };
  }

  const stmts = {};
  for (const [name, sql] of Object.entries(STMT_SQL))
    stmts[name] = db.prepare(sql);
  for (const name of SCOPABLE)
    stmts[`${name}Scoped`] = db.prepare(scopedVariant(STMT_SQL[name]));
  // Conditional SQL (depends on the v2 flag), prepared like the view above.
  stmts.chatThreads = db.prepare(chatThreadsSql(hasV2));

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

function run(stmts, name, mode, scope, ...params) {
  const stmt = scope ? stmts[`${name}Scoped`] : stmts[name];
  const args = scope ? [scope, ...params] : params;
  return mode === "get" ? stmt.get(...args) : stmt.all(...args);
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

export function querySessions(stmts, { project, q, limit, offset }) {
  const scope = project != null && project.trim() !== "" ? project : undefined;
  const term = q != null && q.trim() !== "" ? q.trim() : undefined;
  let rows;
  if (term) {
    rows = stmts.sessionsSearch.all(
      scope ?? null,
      scope ?? null,
      term,
      term,
      limit,
      offset,
    );
  } else {
    rows = run(stmts, "sessions", "all", scope, limit, offset);
  }
  const total = rows.length > 0 ? rows[0].total : 0;
  return {
    sessions: rows.map(({ total: _total, ...session }) => session),
    total,
  };
}

export function queryProjects(stmts, scope) {
  return run(stmts, "byProjectOverview", "all", scope);
}

export function queryChatThreads(stmts) {
  return stmts.chatThreads.all();
}
