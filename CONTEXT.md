# Domain Glossary

The ubiquitous language of opencode-token-tracker. Use these names when
talking about the codebase; the source of truth for wire shapes is the query
module (`server/query.mjs`), not this file.

## Telemetry

- **Session** — one row of the opencode `session` table. The atom of
  telemetry: a conversation with cost and token counts. Its identity key is
  `project_name_key` (`COALESCE(p.name, s.directory, 'unknown')`).
- **Project** — a bucket of sessions keyed by `project_name_key`. The key
  doubles as the URL identity: project rows link to `#/project/<encoded key>`
  and `parseProject()` decodes it back.
- **Summary** — the aggregated view of sessions: `totals`, `daily`, `byModel`,
  `byAgent`, `byProject`, and `dateRange`. Aggregation happens in SQL; the
  client never re-groups.
- **db-source** — the data seam every page reads through. The query module
  (`server/query.mjs`) owns SQL, shapes and units (all timestamps are
  milliseconds; epoch normalization lives in the `session_base` view). The
  client's `useQuery` primitive re-issues a page's queries on db-path change
  or refresh.
- **Upstream** — the fetch/cache seam the catalog modules read through.
  `server/upstream.mjs` owns `cachedFetch` and `UpstreamError` (the one error
  type carrying an HTTP status); the catalogs (skills, models, go-usage) own
  their parsers, row shapes, and auth. `index.mjs` never knows upstream
  details.
- **Wire contract** — the field names and units crossing the HTTP seam. The
  query module is authoritative; `src/types/index.ts` mirrors it by hand.

## Views

- **Usage** — the global dashboard (totals, limits, breakdowns, recent
  sessions).
- **Project page** — a scoped view of one project: neural net, cost share,
  model usage, sessions.
- **Settings** — db-path source, theme, and the chat-thread size report.
- **Chat thread** — a session this app created through the chat page (titled
  `chat`, older ones `web search`/`deep research`). Its registry lives in
  localStorage (`oct-search-threads`); its content and size live in the DB —
  the `chatThreads` statement sums the stored message payloads
  (`session_message.data` for opencode 2, `message.data` + `part.data` for
  legacy) per thread, and `threadTimingSql` counts its questions (user-message
  turns) and thinking time (`runMs`: question created → answer finished,
  including tool runs).
- **Export** — the export module (`src/lib/export.ts`). Its single interface
  is `exportReport()`, which returns a Blob; PDF has two internal adapters
  (DOM capture vs jsPDF table), selected by `captureRef` presence. The
  `data-export-*` attribute contract lives in `EXPORT_MARKERS`.
