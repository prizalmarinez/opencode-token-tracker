/*
 * OpenCode Go plan usage. Deep module: owns the upstream fetch (the official
 * /zen/go/v1/usage endpoint), the ~60s in-memory cache, and normalization to
 * the app's wire shape. index.mjs just routes to getGoUsage and serializes
 * JSON — no upstream HTTP or shaping knowledge lives there.
 *
 * The endpoint reports percent used per window plus an ISO reset timestamp —
 * not raw dollar spend. Plan limits are fixed ($12 / $30 / $60, matching the
 * server's ZEN_LIMITS), so spent = limit * percent / 100. Auth is the
 * opencode-go API key as a Bearer token; the key is resolved by index.mjs
 * (browser-sent header or OPENCODE_GO_API_KEY) and never lives here.
 *
 * Contract per window: { status: "ok" | "rate-limited", percent: 0-100,
 * resetsAt: ISO 8601 UTC } — see
 * https://github.com/anomalyco/opencode/pull/16513 and
 * https://opencode.ai/docs/go/ (usage limits).
 */

const BASE = process.env.OPENCODE_GO_BASE_URL || "https://opencode.ai";
const CACHE_TTL_MS = 60_000;

// Plan limits in dollars (docs / ZEN_LIMITS). Display-only — the server is
// the authority for the actual caps; spent shown in the UI is derived.
const LIMITS = { rolling: 12, weekly: 30, monthly: 60 };

const usageCache = new Map();

export class GoUsageError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "GoUsageError";
    this.status = status;
  }
}

function normalizeWindow(raw) {
  if (!raw || typeof raw !== "object") return null;
  const percent = Number(raw.percent);
  return {
    status: raw.status === "rate-limited" ? "rate-limited" : "ok",
    percent: Number.isFinite(percent)
      ? Math.min(100, Math.max(0, percent))
      : null,
    resetsAt: typeof raw.resetsAt === "string" ? raw.resetsAt : null,
  };
}

export async function getGoUsage(apiKey) {
  const cached = usageCache.get(apiKey);
  if (cached && Date.now() < cached.expiresAt) return cached.payload;

  let res;
  try {
    res = await fetch(`${BASE}/zen/go/v1/usage`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "User-Agent": "opencode-token-tracker/1.0",
      },
    });
  } catch {
    throw new GoUsageError(`cannot reach ${BASE} — is the network up?`, 503);
  }

  if (res.status === 401)
    throw new GoUsageError(
      "OpenCode Go rejected the API key (401) — check it in Settings or OPENCODE_GO_API_KEY.",
      401,
    );
  if (res.status === 403)
    throw new GoUsageError(
      "OpenCode Go subscription required (403) — this key has no Go plan.",
      403,
    );
  if (!res.ok)
    throw new GoUsageError(
      `OpenCode Go usage API responded ${res.status}`,
      502,
    );

  const data = await res.json();
  const usage = data?.usage ?? {};

  const payload = {
    limits: LIMITS,
    usage: {
      rolling: normalizeWindow(usage.rolling),
      weekly: normalizeWindow(usage.weekly),
      monthly: normalizeWindow(usage.monthly),
    },
    fetchedAt: new Date().toISOString(),
  };
  usageCache.set(apiKey, { payload, expiresAt: Date.now() + CACHE_TTL_MS });
  return payload;
}
