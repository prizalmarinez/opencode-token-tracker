/*
 * OpenRouter models catalog. Deep module: owns the upstream fetch (via the
 * shared upstream.mjs seam), the normalization to the app's wire shape, and
 * the cache key. index.mjs just routes to getModelsLeaderboard and serializes
 * JSON — no upstream HTTP or shaping knowledge lives there.
 *
 * The Models API (GET /api/v1/models) is public — no API key required. It
 * supports server-side ranking via the `sort` query parameter; we expose the
 * three sorts the app's UI offers as tabs.
 */

import { cachedFetch, UpstreamError } from "./upstream.mjs";

const BASE = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai";

const SORT_PARAM = {
  "top-weekly": "top-weekly",
  "pricing-low-to-high": "pricing-low-to-high",
  "context-high-to-low": "context-high-to-low",
};

function parsePrice(value) {
  if (typeof value !== "string") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function bestArena(entry) {
  const rows = entry.benchmarks?.design_arena;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows.reduce(
    (best, row) => (row.rank < best.rank ? row : best),
    rows[0],
  );
}

export async function getModelsLeaderboard(sort) {
  const sortParam = SORT_PARAM[sort];
  if (!sortParam)
    throw new UpstreamError(
      400,
      `unknown model sort "${sort}" (use top-weekly, pricing-low-to-high, or context-high-to-low)`,
    );

  const { data, fetchedAt } = await cachedFetch(
    `models:${sort}`,
    `${BASE}/api/v1/models?sort=${sortParam}`,
    {
      headers: {
        "HTTP-Referer": "http://localhost:5174",
        "X-Title": "opencode token-tracker",
      },
      parse: async (text) => JSON.parse(text),
    },
  );

  const models = (data.data ?? []).map((m) => {
    const pricing = m.pricing ?? {};
    const promptPrice = parsePrice(pricing.prompt);
    const completionPrice = parsePrice(pricing.completion);
    const arena = bestArena(m);
    return {
      id: m.id,
      name: m.name ?? m.id,
      contextLength: m.context_length ?? null,
      promptPrice,
      completionPrice,
      inputCacheReadPrice: parsePrice(pricing.input_cache_read),
      isFree: promptPrice === 0 && completionPrice === 0,
      arenaRank: arena?.rank ?? null,
      arenaCategory: arena?.category ?? null,
      arenaElo: arena?.elo ?? null,
      url: `${BASE}/${m.id}`,
    };
  });

  return { sort, models, fetchedAt };
}
