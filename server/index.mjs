import { createServer } from "node:http";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
  closeAll,
  getOpen,
  querySessions,
  queryStatus,
  querySummary,
} from "./query.mjs";

const DEFAULT_DB = join(
  homedir(),
  ".local",
  "share",
  "opencode",
  "opencode.db",
);
const PORT = parseInt(process.env.OPCODE_SERVER_PORT || "3100", 10);
// Keep in sync with PAGE_SIZE in src/lib/api.ts — the client pages at 500.
const MAX_LIMIT = 500;

/*
 * HTTP adapter. Thin: resolves the db path, checks the origin, routes to the
 * query module, serializes JSON. All SQL/schema/aggregation lives in
 * ./query.mjs. CORS is checked exactly once, at the top of the request.
 */

function expandTilde(p) {
  return p === "~"
    ? homedir()
    : p.startsWith("~/")
      ? join(homedir(), p.slice(2))
      : p;
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  try {
    const u = new URL(origin);
    return (
      u.protocol === "http:" &&
      (u.hostname === "localhost" || u.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

function resolveDbPath(searchParams) {
  const q = searchParams.get("db");
  if (q && q.trim()) return resolve(expandTilde(q.trim()));
  if (process.env.OPENCODE_DB && process.env.OPENCODE_DB.trim())
    return resolve(expandTilde(process.env.OPENCODE_DB.trim()));
  return DEFAULT_DB;
}

function writeJson(res, status, data, corsOrigin) {
  const body = JSON.stringify(data);
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...(corsOrigin ? { "Access-Control-Allow-Origin": corsOrigin } : {}),
  };
  res.writeHead(status, headers);
  res.end(body);
}

function handle(pathname, searchParams) {
  const dbPath = resolveDbPath(searchParams);
  const opened = getOpen(dbPath);
  if (opened.error)
    return { status: 503, body: { error: opened.error, dbPath } };

  switch (pathname) {
    case "/api/status":
      return { status: 200, body: { dbPath, ...queryStatus(opened.stmts, dbPath) } };
    case "/api/summary": {
      const project = searchParams.get("project");
      return {
        status: 200,
        body: querySummary(opened.stmts, project || undefined),
      };
    }
    case "/api/sessions": {
      const project = searchParams.get("project");
      const limit = Math.min(
        Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1),
        MAX_LIMIT,
      );
      const offset = Math.max(
        parseInt(searchParams.get("offset") || "0", 10) || 0,
        0,
      );
      return {
        status: 200,
        body: querySessions(opened.stmts, {
          project: project || undefined,
          limit,
          offset,
        }),
      };
    }
    default:
      return { status: 404, body: { error: "Not found" } };
  }
}

const server = createServer((req, res) => {
  const origin = req.headers.origin;
  const allowed = isAllowedOrigin(origin);
  const corsOrigin = origin && allowed ? origin : null;

  if (!allowed) {
    writeJson(res, 403, { error: "forbidden origin" });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...(corsOrigin ? { "Access-Control-Allow-Origin": corsOrigin } : {}),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method !== "GET") {
    writeJson(res, 405, { error: "Method not allowed" }, corsOrigin);
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/health") {
    writeJson(res, 200, { ok: true }, corsOrigin);
    return;
  }

  let result;
  try {
    result = handle(url.pathname, url.searchParams);
  } catch (err) {
    result = { status: 500, body: { error: "internal error" } };
  }
  const { status, body } = result;
  writeJson(res, status, body, corsOrigin);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`opencode token-tracker API running at http://127.0.0.1:${PORT}`);
  console.log(`  GET /health`);
  console.log(`  GET /api/status`);
  console.log(`  GET /api/summary`);
  console.log(`  GET /api/summary?project=<name>`);
  console.log(`  GET /api/sessions?limit=50&offset=0`);
  console.log(`  GET /api/sessions?project=<name>&limit=50&offset=0`);
  console.log(`  (db path via ?db=<path>, OPENCODE_DB env, or ${DEFAULT_DB})`);
});

function shutdown() {
  closeAll();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
