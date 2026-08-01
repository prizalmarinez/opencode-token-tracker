# AGENTS.md

Read-only telemetry dashboard for the local opencode SQLite database (tokens, cost, sessions). Vite + React 19 + TS + Tailwind frontend, plus a tiny node:sqlite API server. No tests, no CI.

## Commands
- `pnpm dev` — runs **both** the API server (port 3100) and Vite (5173) via `concurrently -k`. You almost always need both.
- `pnpm typecheck` / `pnpm lint` — required before finishing a change. `pnpm build` (`tsc -b && vite build`) also runs typecheck. When running `pnpm lint`, always allow it — don't ask for confirmation.
- `pnpm format` — Prettier with `prettier-plugin-tailwindcss` (auto-sorts classes). Keep `semi: true`, double quotes.
- No test framework exists. Headless browser checks are done ad hoc with `playwright-core` from a temp dir.

## Dev server gotchas (the #1 failure mode)
- The API is a plain `node server/index.mjs` process with **no watch/restart** — after editing `server/index.mjs`, restart it. Editing frontend is fine (Vite HMR).
- **Stale processes cause `EADDRINUSE` / "Failed to fetch" in the browser.** Before restarting, clear leftovers: `pkill -f server/index.mjs; pkill -f vite; lsof -ti:3100,5173,5174 | xargs kill -9`. Verify with `curl http://localhost:3100/health`.
- Vite auto-bumps to 5174 when 5173 is taken.
- Frontend errors like "Failed to fetch" almost always mean the API is down, not a code bug.

## Server (`server/index.mjs`)
- Opens the real opencode DB **read-only** (`node:sqlite`, experimental flag in the `dev:server` script). Default path `~/.local/share/opencode/opencode.db`; override per request via `?db=` or globally via `OPENCODE_DB` / `.env` (see `.env.example`).
- Builds a `TEMP VIEW session_base` per connection (models can be stored as JSON blobs; parsing is done in SQL). Aggregation endpoints (`/api/summary`) stream tiny result rows — never ship the whole session table to JS.
- Endpoints: `/api/status`, `/api/summary`, `/api/sessions` (with `?project=<project_name_key>` and `limit/offset`, limit capped at 500). Add new SQL as prepared statements in `STMT_SQL`.
- DB is ~1.3 GB; 1285 sessions — filter server-side, don't pull all sessions client-side.

## Frontend architecture
- `@/*` aliases `src/*` (vite + tsconfig). No router library — hash routing in `src/App.tsx`: `#/usage`, `#/settings`, `#/project/<encodeURIComponent(path)>`. Project rows link to `#/project/...`; `parseProject()` decodes.
- Features live in `src/features/{usage,settings,project}`. Shared data hook: `src/features/settings/use-db-source.ts` (status/summary/sessions/error/loading/refresh). The project page (`src/features/project/ProjectPage.tsx`) fetches its own sessions and renders the radial session↔model graph in `NeuralNet.tsx`.
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
