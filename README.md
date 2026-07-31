# opencode-token-tracker

Read-only telemetry dashboard for the local opencode SQLite database (tokens, cost, sessions). Vite + React 19 + TS + Tailwind frontend, plus a tiny `node:sqlite` API server.

## Usage

```bash
pnpm dev
```

Runs both the API server (port 3100) and Vite (5173). See `AGENTS.md` for details on the dev loop.

## Project structure

```
server/index.mjs                 node:sqlite API server (port 3100)
src/main.tsx                     entry point; applies theme pre-render
src/App.tsx                      hash routing (#/usage, #/settings, #/project/...)
src/index.css                    HSL CSS variables + theme override blocks
src/lib/                         api client, cn(), navigate helpers
src/types/                       shared types
src/components/ui/               hand-rolled primitives (Card, Button, Badge, Input)
src/features/usage/              usage dashboard (charts, stats, breakdowns)
src/features/project/            project page + radial session<->model graph
src/features/settings/           settings page, DB source hook, theme
```

## License

Free to use under the MIT License.
