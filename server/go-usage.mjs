/*
 * OpenCode Go plan usage. Deep module: owns the upstream fetch (the official
 * /zen/go/v1/usage endpoint via the shared upstream.mjs seam), the per-key
 * cache, and normalization to the app's wire shape. index.mjs just routes to
 * getGoUsage and serializes JSON — no upstream HTTP or shaping knowledge lives
 * there.
 *
 * The endpoint reports percent used per window plus an ISO reset timestamp —
 * not raw dollar spend. Plan limits are fixed ($12 / $30 / $60, matching the
 * server's ZEN_LIMITS), so spent = limit * percent / 100. Auth is the
 * opencode-go API key as a Bearer token; the key is resolved by index.mjs
 * (browser-sent header or OPENCODE_GO_API_KEY) and never lives here. Auth
 * statuses (401 bad key, 403 no plan) are mapped via the statusFor hook.
 *
 * Contract per window: { status: "ok" | "rate-limited", percent: 0-100,
 * resetsAt: ISO 8601 UTC } — see
 * https://github.com/anomalyco/opencode/pull/16513 and
 * https://opencode.ai/docs/go/ (usage limits).
 */

import { cachedFetch, UpstreamError } from "./upstream.mjs";

const BASE = process.env.OPENCODE_GO_BASE_URL || "https://opencode.ai";

// Plan limits in dollars (docs / ZEN_LIMITS). Display-only — the server is
// the authority for the actual caps; spent shown in the UI is derived.
const LIMITS = { rolling: 12, weekly: 30, monthly: 60 };

function statusFor(res) {
  if (res.status === 401)
    return new UpstreamError(
      401,
      "OpenCode Go rejected the API key (401) — check it in Settings or OPENCODE_GO_API_KEY.",
    );
  if (res.status === 403)
    return new UpstreamError(
      403,
      "OpenCode Go subscription required (403) — this key has no Go plan.",
    );
  return null;
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
  const { data, fetchedAt } = await cachedFetch(
    `go:${apiKey}`,
    `${BASE}/zen/go/v1/usage`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      statusFor,
      parse: async (text) => JSON.parse(text),
    },
  );

  const usage = data?.usage ?? {};
  return {
    limits: LIMITS,
    usage: {
      rolling: normalizeWindow(usage.rolling),
      weekly: normalizeWindow(usage.weekly),
      monthly: normalizeWindow(usage.monthly),
    },
    fetchedAt,
  };
}
