import { createServer } from "node:http";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
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

const DEFAULT_DB = join(
  homedir(),
  ".local",
  "share",
  "opencode",
  "opencode.db",
);
const PORT = parseInt(process.env.OPCODE_SERVER_PORT || "3100", 10);

/*
 * The session table is scanned once into a TEMP VIEW per connection. Model
 * parsing (opencode stores `model` as either a bare string or a JSON blob
 * like {"id":"...","providerID":"...","variant":"..."}) is pushed into SQL
 * via json_valid/json_extract, so aggregation statements only stream their
 * tiny result rows instead of shipping the whole session table to JS.
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
      COALESCE(SUM(tokens_input), 0) AS tokens_input,
      COALESCE(SUM(tokens_output), 0) AS tokens_output,
      COALESCE(SUM(tokens_reasoning), 0) AS tokens_reasoning,
      COALESCE(SUM(tokens_cache_read), 0) AS tokens_cache_read,
      COALESCE(SUM(tokens_cache_write), 0) AS tokens_cache_write
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
    ORDER BY cost DESC
    LIMIT 20`,
  sessions: `
    SELECT id, time_created AS timeCreated, title, agent, directory, cost,
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
    SELECT id, time_created AS timeCreated, title, agent, directory, cost,
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

// path -> { db, stmts } — one read-only connection + prepared statements per db
const dbCache = new Map();

function expandTilde(p) {
  return p === "~"
    ? homedir()
    : p.startsWith("~/")
      ? join(homedir(), p.slice(2))
      : p;
}

function resolveDbPath(searchParams) {
  const q = searchParams.get("db");
  if (q && q.trim()) return resolve(expandTilde(q.trim()));
  if (process.env.OPENCODE_DB && process.env.OPENCODE_DB.trim())
    return resolve(expandTilde(process.env.OPENCODE_DB.trim()));
  return DEFAULT_DB;
}

function openDb(path) {
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

  const cols = db
    .prepare("PRAGMA table_info(session)")
    .all()
    .map((r) => r.name);
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

  dbCache.set(path, { db, stmts });
  return { db, stmts };
}

function buildSummary(stmts) {
  const t = stmts.totals.get();
  return {
    exportedAt: new Date().toISOString(),
    dateRange: null,
    totals: {
      sessions: t.sessions,
      cost: t.cost,
      tokensInput: t.tokens_input,
      tokensOutput: t.tokens_output,
      tokensReasoning: t.tokens_reasoning,
      tokensCacheRead: t.tokens_cache_read,
      tokensCacheWrite: t.tokens_cache_write,
    },
    daily: stmts.daily.all(),
    byModel: stmts.byModel.all(),
    byAgent: stmts.byAgent.all(),
    byProject: stmts.byProject.all(),
  };
}

function writeJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function handle(pathname, searchParams) {
  const dbPath = resolveDbPath(searchParams);
  const opened = openDb(dbPath);
  if (opened.error)
    return { status: 503, body: { error: opened.error, dbPath } };

  switch (pathname) {
    case "/api/status": {
      const { n } = opened.stmts.count.get();
      return {
        status: 200,
        body: { ok: true, dbPath, exists: true, sessionCount: n },
      };
    }
    case "/api/summary":
      return { status: 200, body: buildSummary(opened.stmts) };
    case "/api/sessions": {
      const project = searchParams.get("project");
      const limit = Math.min(
        Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1),
        500,
      );
      const offset = Math.max(
        parseInt(searchParams.get("offset") || "0", 10) || 0,
        0,
      );
      const rows =
        project != null && project.trim() !== ""
          ? opened.stmts.sessionsByProject.all(project, limit, offset)
          : opened.stmts.sessions.all(limit, offset);
      return { status: 200, body: rows };
    }
    default:
      return { status: 404, body: { error: "Not found" } };
  }
}

const server = createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method !== "GET") {
    writeJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/health") {
    writeJson(res, 200, { ok: true });
    return;
  }

  const { status, body } = handle(url.pathname, url.searchParams);
  writeJson(res, status, body);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`opencode token-tracker API running at http://127.0.0.1:${PORT}`);
  console.log(`  GET /health`);
  console.log(`  GET /api/status`);
  console.log(`  GET /api/summary`);
  console.log(`  GET /api/sessions?limit=50&offset=0`);
  console.log(`  GET /api/sessions?project=<name>&limit=50&offset=0`);
  console.log(`  (db path via ?db=<path>, OPENCODE_DB env, or ${DEFAULT_DB})`);
});

function shutdown() {
  for (const { db } of dbCache.values()) {
    try {
      db.close();
    } catch {}
  }
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
