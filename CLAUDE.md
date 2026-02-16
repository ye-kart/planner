# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm build                # tsc + vite build (all packages, in dependency order)
pnpm dev                  # tsx packages/cli/src/index.ts (no build step)
pnpm dev:api              # API server on port 3000
pnpm dev:web              # Vite dev server on port 5173 (proxies /api → :3000)
pnpm dev:full             # Both API + Vite concurrently
pnpm test                 # vitest run (all tests)
npx vitest run tests/unit              # unit tests only
npx vitest run tests/integration       # integration tests only
npx vitest run tests/integration/api   # API integration tests only
npx vitest run tests/e2e               # E2E tests only
npx vitest run tests/unit/streak.test.ts  # single file
pnpm lint                 # tsc --noEmit (all packages)
pnpm --filter @planner/core build      # build single package
```

## Monorepo Structure

pnpm workspace with six packages:

```
packages/
  core/    → @planner/core  — headless engine (zero UI deps)
  ai/      → @planner/ai    — AI chat service, tools, prompt (UI-agnostic)
  cli/     → @planner/cli   — Commander.js CLI
  tui/     → @planner/tui   — Ink/React terminal UI
  api/     → @planner/api   — Hono REST API server
  web/     → @planner/web   — React SPA (Vite + Tailwind v4)
```

Dependency graph: `cli → tui → ai → core`, `api → ai → core`, `web` (standalone SPA). Core has no workspace dependencies.

**Workspace config:** `pnpm-workspace.yaml` declares `packages/*`. Each package has its own `package.json` and `tsconfig.json` extending `tsconfig.base.json`.

**TypeScript project references:** Root `tsconfig.json` references all four packages. Each package's `tsconfig.json` uses `composite: true` and references its dependencies.

## Architecture

Strict 4-layer architecture — each layer only imports the one below:

```
Commands (packages/cli/src/commands/)        → parse args, call services, format output
Services (packages/core/src/services/)       → business logic, validation, orchestration
Repositories (packages/core/src/repositories/) → Drizzle queries, no logic
Database (packages/core/src/db/)             → SQLite via better-sqlite3
```

**Rules:** Commands never import repositories. Services never import Commander or formatters. Repositories never validate.

**DI:** Constructor injection wired in `packages/core/src/container.ts` as lazy singletons. No framework. `getContainer()` for production, `createTestContainer(createTestDb())` for tests. AI extends core container via `createAiContainer()` in `packages/ai/src/container.ts` (adds `ChatService`). TUI delegates to AI container via `createTuiContainer()` in `packages/tui/src/container.ts`. API extends AI container via `createApiContainer()` in `packages/api/src/container.ts` (adds `sessionRepo`).

**Sync everywhere:** better-sqlite3 is synchronous. No `async/await` in the core codebase. API route handlers use `async` only for body parsing (`c.req.json()`).

## Package Responsibilities

### @planner/core (`packages/core/`)
- Database: schema, migrations, connection, seed
- Repositories: area, goal, task, habit, milestone, completion, conversation, message, session
- Services: area, goal, task, habit, init, status, context, config, export, streak
- Utils: date, id, guard, output, paths
- Errors: PlannerError, NotFoundError, ValidationError, NotInitializedError
- Barrel export: `packages/core/src/index.ts` — public API surface

### @planner/cli (`packages/cli/`)
- Commands: areas, goals, tasks, habits, init, status, context, export, tui
- Formatters: area, goal, task, habit, status
- Entry point: `packages/cli/src/index.ts` (bin: `plan`)

### @planner/ai (`packages/ai/`)
- Services: chat.service (OpenAI streaming + tool loop), chat-prompt (system prompt builder), chat-tools (tool definitions + executor)
- Container: `createAiContainer()` extending core with `ChatService`
- UI-agnostic: accepts `currentScreen: string` instead of TUI's `Screen` enum
- Barrel export: `packages/ai/src/index.ts`

### @planner/tui (`packages/tui/`)
- TUI: app, screens (areas, goals, tasks, habits, dashboard), components, themes, hooks
- Container: `createTuiContainer()` delegating to `@planner/ai`

### @planner/api (`packages/api/`)
- Routes: areas, goals, tasks, habits, status, chat (SSE streaming), auth (GitHub OAuth)
- Middleware: error handler (`app.onError` mapping PlannerError → HTTP status), auth (session cookies)
- Container: `createApiContainer()` extending AI container with `sessionRepo`
- Pattern: `createXRoutes(container)` factory returns Hono sub-app
- Entry: `src/index.ts` exports `createApp(container?)`, `src/server.ts` starts the server
- In production, serves `packages/web/dist/` as static files with SPA fallback

### @planner/web (`packages/web/`)
- React SPA built with Vite + Tailwind v4
- Pages: dashboard, areas, goals, tasks, habits, login
- Themes: 7 color themes (same hex values as TUI), CSS custom properties, Zustand-persisted
- State: TanStack Query for server state, Zustand for client state (theme, keyboard mode)
- Chat: SSE streaming via fetch + ReadableStream
- Keyboard: vim-style navigation (j/k/Enter/Backspace), screen shortcuts (1-5), action keys (n/e/x/d/s)

## Key Conventions

- **Import extensions:** Always use `.js` in relative imports (`import { x } from './foo.js'`). Cross-package imports use bare specifiers (`import { x } from '@planner/core'`) — no extension needed.
- **Strict TypeScript:** No `any` except repository update methods (Drizzle partial type limitation)
- **Dates:** Always `YYYY-MM-DD` strings, never Date objects in storage. Use helpers from `packages/core/src/utils/date.ts`
- **IDs:** 8-char alphanumeric via `generateId()` in `packages/core/src/utils/id.ts`
- **Naming:** Files `kebab-case`, classes `PascalCase`, functions `camelCase`, DB columns `snake_case`, TS properties `camelCase`
- **Output:** Commands use `formatOutput(data, humanFormatter, { json })` to switch between JSON and human-readable. Context commands always output JSON directly.

## Error Handling

All domain errors extend `PlannerError` (`packages/core/src/errors.ts`): `NotFoundError`, `ValidationError`, `NotInitializedError`. Caught at the CLI layer in `packages/cli/src/index.ts`. Services throw, commands catch.

## CLI Patterns

- Parent commands with subcommands must use `.passThroughOptions()` (Commander.js requirement)
- Root program uses `.enablePositionalOptions()` (prerequisite for passThroughOptions)
- Every command (except `init`) calls `ensureInitialized()` first
- Every command calls `getContainer()` to access services

## Database

- Schema source of truth: `packages/core/src/db/schema.ts` (Drizzle table definitions)
- Migrations: `packages/core/src/db/migrate.ts` — raw `CREATE TABLE IF NOT EXISTS` statements, run individually (Drizzle's `db.run()` only supports single statements)
- Foreign keys require `pragma('foreign_keys = ON')` — set in `packages/core/src/db/connection.ts`
- Deleting areas/goals orphans children (`SET NULL`). Deleting goals cascades milestones. Deleting habits cascades completions.
- Drizzle queries: `.get()` for single row, `.all()` for arrays, `.run()` for mutations

## Testing

Three layers, all use Vitest with globals enabled (no imports needed for describe/it/expect). Tests live at the workspace root in `tests/`. Vitest resolve aliases map `@planner/core`, `@planner/ai`, `@planner/cli`, `@planner/tui`, and `@planner/api` to source entry points (no build required for testing).

| Layer | Pattern | Key helper |
|-------|---------|------------|
| **Unit** (`tests/unit/`) | Pure functions, no I/O | — |
| **Integration** (`tests/integration/`) | `createTestDb()` gives fresh in-memory SQLite per test | `tests/integration/helpers/db.ts` |
| **Integration API** (`tests/integration/api/`) | Hono `app.request()` (no server start), `createTestApp()` per test | `tests/integration/api/helpers.ts` |
| **E2E** (`tests/e2e/`) | `setupTestDir()` creates isolated temp dir, `runCli()`/`runCliJson()` spawn real processes | `tests/e2e/helpers/cli.ts` |

For context commands in E2E tests, use `runCliParseJson()` (doesn't append `--json` flag).

## Git Commits

Every commit message starts with a meaningful emoji. Imperative mood, under 72 chars.

| Emoji | Code | Use for |
|-------|------|---------|
| :sparkles: | `:sparkles:` | New feature |
| :bug: | `:bug:` | Bug fix |
| :recycle: | `:recycle:` | Refactor |
| :lipstick: | `:lipstick:` | UI / cosmetic / formatter changes |
| :white_check_mark: | `:white_check_mark:` | Add or update tests |
| :memo: | `:memo:` | Documentation |
| :wrench: | `:wrench:` | Config files (tsconfig, vitest, drizzle) |
| :building_construction: | `:building_construction:` | Architectural / structural changes |
| :zap: | `:zap:` | Performance improvement |
| :fire: | `:fire:` | Remove code or files |
| :truck: | `:truck:` | Move or rename files |
| :package: | `:package:` | Dependencies (add, update, remove) |
| :lock: | `:lock:` | Security fix |
| :tada: | `:tada:` | Initial commit / major milestone |
| :ambulance: | `:ambulance:` | Critical hotfix |
| :art: | `:art:` | Code style / formatting |
| :construction: | `:construction:` | Work in progress |
| :wastebasket: | `:wastebasket:` | Deprecate or clean up dead code |

Example: `✨ Add habit archiving command` not `Added habit archiving command`

## Adding Features

**New command:** Add service method in `@planner/core` → register CLI command in `@planner/cli` with `ensureInitialized()` + `formatOutput()` → add integration + E2E tests.

**New entity:** schema.ts table → migrate.ts CREATE TABLE → repository → service (in `@planner/core`) → export from `packages/core/src/index.ts` → formatter → command (in `@planner/cli`) → wire in container.ts → update context.service.ts → tests.

**Schema change:** Update schema.ts + add ALTER TABLE in migrate.ts. New columns must have defaults or be nullable.

**Before committing a new feature:** Always review `README.md` and update it to reflect the new functionality — add feature bullets, command examples, configuration, or sections as needed. The README is the primary user-facing documentation and must stay in sync with the codebase.

## TUI Screenshots (VHS)

Use [VHS](https://github.com/charmbracelet/vhs) to capture TUI screenshots and GIFs. Requires `vhs`, `ttyd`, and `ffmpeg`.

```bash
vhs demo.tape              # run the tape → generates screenshots/ + demo.gif
```

The tape file (`demo.tape`) scripts terminal interactions: launches the TUI, navigates screens, and captures PNGs. Use `Hide`/`Show` to hide startup noise (npm output). Screenshots land in `screenshots/`.

Key patterns:
- `Set Shell "bash"` + `Hide` → `Type "clear && npx tsx packages/cli/src/index.ts tui --theme purple"` → `Enter` → `Sleep 5s` → `Show` — hides boot sequence
- `Type "2"` navigates to screen 2 (Areas), `Screenshot screenshots/02-areas.png` captures it
- TUI source: `packages/tui/src/tui/` (Ink + React), screens in `packages/tui/src/tui/screens/`, themes: neon, matrix, purple
