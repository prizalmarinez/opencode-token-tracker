# AGENTS.md

Read-only telemetry dashboard for the local opencode SQLite database (tokens, cost, sessions). Vite + React 19 + TS + Tailwind frontend, plus a tiny node:sqlite API server. No tests, no CI.

## Commands
- `pnpm dev` — runs **both** the API server (port 3100) and Vite (5173) via `concurrently -k`. You almost always need both.
- `pnpm typecheck` / `pnpm lint` — required before finishing a change. `pnpm build` (`tsc -b && vite build`) also runs typecheck. When running `pnpm lint`, always allow it — don't ask for confirmation.
- `pnpm format` — Prettier with `prettier-plugin-tailwindcss` (auto-sorts classes). Keep `semi: true`, double quotes.
- No test framework exists. Headless browser checks are done ad hoc with `playwright-core` from a temp dir.

## Dev server gotchas (the #1 failure mode)
- The API is a plain `node server/index.mjs` process with **no watch/restart** — after editing `server/*.mjs` (`index.mjs` or `query.mjs`), restart it. Editing frontend is fine (Vite HMR).
- **Stale processes cause `EADDRINUSE` / "Failed to fetch" in the browser.** Before restarting, clear leftovers: `pkill -f server/index.mjs; pkill -f vite; lsof -ti:3100,5173,5174 | xargs kill -9`. Verify with `curl http://localhost:3100/health`.
- Vite auto-bumps to 5174 when 5173 is taken.
- Frontend errors like "Failed to fetch" almost always mean the API is down, not a code bug.

## Server (`server/`)
Split into a **query module** and a **thin HTTP adapter**:
- `server/query.mjs` — the deep module. Owns the real opencode DB **read-only** (`node:sqlite`, experimental flag in the `dev:server` script), the `session_base` TEMP VIEW, all prepared statements in `STMT_SQL`, and the per-path connection cache. Interface: `getOpen(path)`, `querySummary(stmts, scope?)`, `querySessions(stmts, {project, limit, offset})`, `queryStatus(stmts)`, `closeAll()`. Scoped variants are derived by injecting `WHERE project_name_key = ?` after `FROM session_base` (see `SCOPABLE`) — add new SQL as prepared statements in `STMT_SQL` only, never as ad-hoc query strings.
- `server/index.mjs` — the HTTP adapter. Resolves the db path (`?db=` → `OPENCODE_DB` → default), checks CORS **once** at the top of the request, routes `/api/*` to the query module, serializes JSON. No SQL here.
- Default DB path `~/.local/share/opencode/opencode.db`.
- Endpoints: `/api/status`, `/api/summary` (with `?project=<project_name_key>`), `/api/sessions` (with `?project=` and `limit/offset`, limit capped at 500). Aggregation endpoints stream tiny result rows — never ship the whole session table to JS.
- DB is ~1.3 GB; 1285 sessions — filter server-side, don't pull all sessions client-side.

## Frontend architecture
- `@/*` aliases `src/*` (vite + tsconfig). No router library — hash routing in `src/App.tsx`: `#/usage`, `#/settings`, `#/project/<encodeURIComponent(path)>`. Project rows link to `#/project/...`; `parseProject()` decodes.
- Features live in `src/features/{usage,settings,project}`. Shared data hook: `src/features/settings/use-db-source.ts` (status/summary/sessions/error/loading/refresh). The project page (`src/features/project/ProjectPage.tsx`) fetches its own scoped `summary` (`getSummary(dbPath, project)`) plus raw sessions for the neural net; aggregation is server-side, so it must not re-GROUP BY client-side.
- **Lint is strict**: `react-hooks/set-state-in-effect` (recommended config) errors on synchronous `setState()` in an effect body. Follow the existing pattern: wrap async work in an inner `run()` (see `use-db-source.ts`). `noUnusedLocals`/`noUnusedParameters` are on in tsconfig — unused vars fail typecheck and `no-unused-vars` fails lint.
- Recharts 3: chart class names differ from v2 (e.g. `g.recharts-bar-rectangle`); custom tooltip uses `p.name` over `p.dataKey`. Charts cap at top 8 + an aggregated "other" slice; `src/features/usage/chart-colors.ts` is the shared palette.
- `lucide-react` here has no brand icons — the GitHub header icon is an inline SVG.

## Styling / tokens
- All colors are HSL CSS variables in `src/index.css` (`--background`, `--accent`, `--muted-foreground`, `--border`, ...) consumed via `hsl(var(--accent) / 0.5)`; Tailwind maps them (e.g. `text-accent`, `bg-muted`). Don't hardcode hex in components.
- Theme system: `<html data-theme>` override blocks in `index.css`; the app theme (localStorage key `oct-theme`, default ember/orange) is applied in `src/main.tsx` pre-render.
- `Card` root element's class is `card-surface` — not `rounded-lg`/`card` (a `cn()` merge of `"card-surface group relative overflow-hidden p-5"`). Don't rely on Tailwind class names to locate it.
- Font is IBM Plex Mono everywhere via `--font-mono`; classes like `num` (tabular figures) are defined in `index.css`.

## Misc
- Repo has no commits yet; don't assume a commit convention. `.gitignore` excludes `dist`, `node_modules`, `.env*`.
- Components are hand-rolled primitives in `src/components/ui/` (Card, Button, Badge, Input) — extend those rather than adding a UI dependency.
