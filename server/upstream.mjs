/*
 * Shared upstream seam for the catalog modules (skills.sh, OpenRouter,
 * opencode.ai). Owns the fetch + in-memory cache machinery and the one error
 * type every upstream module throws. Each catalog keeps its parser, row shape,
 * and auth — only the fetch/cache envelope is shared.
 *
 * cachedFetch(key, url, {headers, ttl, parse, statusFor}) → {data, fetchedAt}
 *  - key      cache key; ttl 0 skips the cache entirely (search endpoints)
 *  - parse    async (text) → data — the parsed payload is what gets cached
 *  - statusFor(res) → UpstreamError | null — optional per-upstream non-2xx
 *    mapping (e.g. go-usage's 401/403 auth semantics); null falls through to
 *    the default 502
 *  - network failures become 503. The cache is bounded (evict-oldest past
 *    MAX_CACHE_KEYS) so per-key caches (API keys) can't grow unbounded.
 */

const DEFAULT_TTL_MS = 60_000;
const MAX_CACHE_KEYS = 8;
const UA = "opencode-token-tracker/1.0";

const cache = new Map();

export class UpstreamError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

export async function cachedFetch(
  key,
  url,
  { headers, ttl = DEFAULT_TTL_MS, parse, statusFor } = {},
) {
  if (ttl > 0) {
    const cached = cache.get(key);
    if (cached && Date.now() < cached.expiresAt) return cached.payload;
  }

  let res;
  try {
    res = await fetch(url, { headers: { "User-Agent": UA, ...headers } });
  } catch {
    throw new UpstreamError(
      503,
      `cannot reach upstream ${url} — is the network up?`,
    );
  }

  if (!res.ok) {
    if (statusFor) {
      const mapped = statusFor(res);
      if (mapped) throw mapped;
    }
    throw new UpstreamError(502, `upstream responded ${res.status} for ${url}`);
  }

  const data = await parse(await res.text());
  const payload = { data, fetchedAt: new Date().toISOString() };

  if (ttl > 0) {
    cache.set(key, { payload, expiresAt: Date.now() + ttl });
    if (cache.size > MAX_CACHE_KEYS) cache.delete(cache.keys().next().value);
  }
  return payload;
}
