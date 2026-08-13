import {
  createServer,
  get as httpGet,
  request as httpRequest,
} from "node:http";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
  closeAll,
  getOpen,
  queryProjects,
  querySessions,
  queryStatus,
  querySummary,
} from "./query.mjs";
import {
  getInstalledSkills,
  getSkillsLeaderboard,
  searchSkills,
} from "./skills.mjs";
import { getModelsLeaderboard } from "./models.mjs";
import { getGoUsage } from "./go-usage.mjs";
import { UpstreamError } from "./upstream.mjs";

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

// Chat proxies /api/chat/** to the live opencode server (opencode serve, :4096).
// The frontend talks to this server so the browser only needs one origin —
// no CORS config on the opencode side, and OPENCODE_SERVER_PASSWORD (if any)
// never reaches the browser.
const CHAT_HOST = "127.0.0.1";
const CHAT_PORT = parseInt(process.env.OPENCODE_CHAT_PORT || "4096", 10);

// The opencode server exposes its own health probe at /global/health. We proxy
// it (same trick as /api/chat) so the browser never talks to :4096 directly and
// the frontend gets one origin + one CORS story. Timeout keeps the probe from
// hanging when the server is down — a refused/empty connect fails fast anyway.
const HEALTH_TIMEOUT_MS = 1500;

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

/*
 * One response funnel for every GET route. Resolves a handler's promise:
 * {status, body} passes through untouched, null becomes 404, UpstreamError
 * carries its own status (400 validation / 401 / 403 auth / 502 / 503
 * upstream), and anything else falls back to fallbackStatus/fallbackMessage —
 * 503 + the error message for the catalog routes, 500 + a deliberately
 * generic message for the DB routes (which must not leak internals).
 */
async function respondTo(
  promise,
  { fallbackStatus = 503, fallbackMessage } = {},
) {
  let result;
  try {
    result = await promise;
  } catch (err) {
    if (err instanceof UpstreamError) {
      return { status: err.status, body: { error: err.message } };
    }
    return {
      status: fallbackStatus,
      body: {
        error:
          fallbackMessage ?? (err instanceof Error ? err.message : String(err)),
      },
    };
  }
  if (!result) return { status: 404, body: { error: "Not found" } };
  return { status: result.status, body: result.body };
}

/*
 * Streaming reverse proxy for /api/chat/** → http://127.0.0.1:4096/**.
 * Pipes both the request body and the response body so SSE (/event) streams
 * through un-buffered. The browser origin is already allowed (or rejected) by
 * the caller; we only add the permissive CORS header for SSE, which fetch
 * needs to read the stream cross-origin.
 */
function proxyChat(req, res, url, corsOrigin) {
  const upstreamPath = url.pathname.replace(/^\/api\/chat/, "") || "/";
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;

  const proxyReq = httpRequest(
    {
      hostname: CHAT_HOST,
      port: CHAT_PORT,
      path: `${upstreamPath}${url.search}`,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      const resHeaders = { ...proxyRes.headers };
      delete resHeaders["access-control-allow-origin"];
      delete resHeaders.vary;
      if (corsOrigin) resHeaders["Access-Control-Allow-Origin"] = corsOrigin;
      res.writeHead(proxyRes.statusCode ?? 502, resHeaders);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", () => {
    if (res.headersSent) {
      res.end();
      return;
    }
    writeJson(
      res,
      502,
      {
        error:
          "opencode server not running — start it with `pnpm dev` (or `opencode serve --port 4096`)",
      },
      corsOrigin,
    );
  });

  req.pipe(proxyReq);
}

/*
 * Health probe for the opencode server (opencode serve, :4096). GETs its
 * /global/health through node:http — the same upstream the chat proxy uses —
 * and reports ok/latency. Never throws: connection refused, timeout, and
 * non-2xx responses all come back as a well-formed "down" result.
 */
function probeOpencodeHealth(corsOrigin) {
  return new Promise((resolve) => {
    const started = Date.now();
    const req = httpGet(
      { hostname: CHAT_HOST, port: CHAT_PORT, path: "/global/health" },
      (res) => {
        const latencyMs = Date.now() - started;
        res.resume();
        const ok = res.statusCode === 200;
        resolve({
          ok,
          latencyMs,
          checkedAt: new Date().toISOString(),
          ...(ok ? {} : { error: `HTTP ${res.statusCode}` }),
        });
      },
    );
    req.setTimeout(HEALTH_TIMEOUT_MS, () => req.destroy(new Error("timeout")));
    req.on("error", (err) => {
      resolve({
        ok: false,
        latencyMs: null,
        checkedAt: new Date().toISOString(),
        error: err.code || err.message,
      });
    });
  });
}

/*
 * skills.sh catalog (leaderboard / search / locally-installed). These read no
 * DB and need no prepared statements — they live outside the query module and
 * stay GET-only. Errors surface through respondTo: UpstreamError carries its
 * own status (validation 400, upstream 502/503); the 404 for unknown subpaths
 * comes from the null return.
 */
async function handleSkills(url) {
  const { pathname, searchParams } = url;
  if (pathname === "/api/skills/leaderboard") {
    const view = searchParams.get("view") || "all-time";
    return { status: 200, body: await getSkillsLeaderboard(view) };
  }
  if (pathname === "/api/skills/search") {
    const q = (searchParams.get("q") || "").trim();
    return { status: 200, body: await searchSkills(q) };
  }
  if (pathname === "/api/skills/installed") {
    return { status: 200, body: await getInstalledSkills() };
  }
  return null;
}

/*
 * OpenRouter models catalog. Also no DB and GET-only, same error contract as
 * skills: unknown sorts throw UpstreamError(400), upstream failures 502/503.
 */
async function handleModels(url) {
  const { pathname, searchParams } = url;
  if (pathname === "/api/models/leaderboard") {
    const sort = searchParams.get("sort") || "top-weekly";
    return { status: 200, body: await getModelsLeaderboard(sort) };
  }
  return null;
}

/*
 * OpenCode Go plan usage (rolling 5h / weekly / monthly from the official
 * /zen/go/v1/usage endpoint — the dashboard numbers, not local DB guesses).
 * GET-only, no DB. The browser sends the Go API key as X-OpenCode-Go-Key
 * (set in Settings, stored in the browser); the server falls back to the
 * OPENCODE_GO_API_KEY env var. The key only ever crosses localhost and never
 * appears in a URL. Auth errors (401 bad key, 403 no plan) pass through so
 * the UI can explain them.
 */
async function handleGoUsage(req, url) {
  if (url.pathname !== "/api/go/usage") return null;
  const headerKey = (req.headers["x-opencode-go-key"] || "").trim();
  const apiKey = headerKey || (process.env.OPENCODE_GO_API_KEY || "").trim();
  if (!apiKey) {
    return {
      status: 400,
      body: {
        error:
          "no OpenCode Go API key — paste it in Settings (or set OPENCODE_GO_API_KEY)",
      },
    };
  }
  return { status: 200, body: await getGoUsage(apiKey) };
}

function handle(pathname, searchParams) {
  const dbPath = resolveDbPath(searchParams);
  const opened = getOpen(dbPath);
  if (opened.error)
    return { status: 503, body: { error: opened.error, dbPath } };

  switch (pathname) {
    case "/api/status":
      return {
        status: 200,
        body: { dbPath, ...queryStatus(opened.stmts, dbPath) },
      };
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
    case "/api/projects": {
      const project = searchParams.get("project");
      return {
        status: 200,
        body: queryProjects(opened.stmts, project || undefined),
      };
    }
    default:
      return { status: 404, body: { error: "Not found" } };
  }
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  const allowed = isAllowedOrigin(origin);
  const corsOrigin = origin && allowed ? origin : null;

  if (!allowed) {
    writeJson(res, 403, { error: "forbidden origin" });
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Chat proxy first: forwards GET + POST + DELETE and streams SSE. The rest
  // of the server stays GET-only and read-only.
  if (url.pathname.startsWith("/api/chat")) {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        ...(corsOrigin ? { "Access-Control-Allow-Origin": corsOrigin } : {}),
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }
    if (
      req.method !== "GET" &&
      req.method !== "POST" &&
      req.method !== "DELETE"
    ) {
      writeJson(res, 405, { error: "method not allowed" });
      return;
    }
    proxyChat(req, res, url, corsOrigin);
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...(corsOrigin ? { "Access-Control-Allow-Origin": corsOrigin } : {}),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-OpenCode-Go-Key",
    });
    res.end();
    return;
  }

  if (req.method !== "GET") {
    writeJson(res, 405, { error: "Method not allowed" }, corsOrigin);
    return;
  }

  if (url.pathname === "/health") {
    writeJson(res, 200, { ok: true }, corsOrigin);
    return;
  }

  if (url.pathname === "/api/opencode-health") {
    // Always 200: "down" is an expected, well-formed answer, not an error.
    // The body's `ok` field carries the truth; the client's request<T>
    // helper rejects non-2xx, so a down probe must not look like a failure.
    probeOpencodeHealth(corsOrigin).then((body) =>
      writeJson(res, 200, body, corsOrigin),
    );
    return;
  }

  try {
    if (url.pathname.startsWith("/api/skills")) {
      const { status, body } = await respondTo(handleSkills(url));
      writeJson(res, status, body, corsOrigin);
      return;
    }

    if (url.pathname.startsWith("/api/models")) {
      const { status, body } = await respondTo(handleModels(url));
      writeJson(res, status, body, corsOrigin);
      return;
    }

    if (url.pathname.startsWith("/api/go")) {
      const { status, body } = await respondTo(handleGoUsage(req, url));
      writeJson(res, status, body, corsOrigin);
      return;
    }

    // DB routes: sync handle() never returns null and must not leak internal
    // errors — the funnel's 500 fallback keeps the message generic.
    const { status, body } = await respondTo(
      Promise.resolve().then(() => handle(url.pathname, url.searchParams)),
      { fallbackStatus: 500, fallbackMessage: "internal error" },
    );
    writeJson(res, status, body, corsOrigin);
  } catch (err) {
    writeJson(res, 500, { error: "internal error" }, corsOrigin);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`opencode token-tracker API running at http://127.0.0.1:${PORT}`);
  console.log(`  GET /health`);
  console.log(`  GET /api/status`);
  console.log(`  GET /api/summary`);
  console.log(`  GET /api/summary?project=<name>`);
  console.log(`  GET /api/projects`);
  console.log(`  GET /api/opencode-health`);
  console.log(`  GET /api/sessions?limit=50&offset=0`);
  console.log(`  GET /api/sessions?project=<name>&limit=50&offset=0`);
  console.log(`  GET /api/skills/leaderboard?view=all-time|trending|hot`);
  console.log(`  GET /api/skills/search?q=<query>`);
  console.log(`  GET /api/skills/installed`);
  console.log(
    `  GET /api/models/leaderboard?sort=top-weekly|pricing-low-to-high|context-high-to-low`,
  );
  console.log(
    `  GET /api/go/usage (Go plan windows; key via X-OpenCode-Go-Key header or OPENCODE_GO_API_KEY)`,
  );
  console.log(
    `  /api/chat/** -> http://127.0.0.1:${CHAT_PORT}/** (opencode serve, proxied)`,
  );
  console.log(`  (db path via ?db=<path>, OPENCODE_DB env, or ${DEFAULT_DB})`);
});

function shutdown() {
  closeAll();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
