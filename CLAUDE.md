# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # tsc → dist/
npm run dev            # tsx src/index.ts (no build step)
npm test               # vitest run (all tests)
npx vitest run tests/unit              # unit tests only
npx vitest run tests/integration       # integration tests only
npx vitest run tests/e2e               # E2E tests only
npx vitest run tests/unit/streak.test.ts  # single file
npm run lint           # tsc --noEmit (type-check only)
```

## Architecture

Strict 4-layer architecture — each layer only imports the one below:

```
Commands (src/commands/)     → parse args, call services, format output
Services (src/services/)     → business logic, validation, orchestration
Repositories (src/repositories/) → Drizzle queries, no logic
Database (src/db/)           → SQLite via better-sqlite3
```

**Rules:** Commands never import repositories. Services never import Commander or formatters. Repositories never validate.

**DI:** Constructor injection wired in `src/container.ts` as lazy singletons. No framework. `getContainer()` for production, `createTestContainer(createTestDb())` for tests.

**Sync everywhere:** better-sqlite3 is synchronous. No `async/await` in the entire codebase.

## Key Conventions

- **Import extensions:** Always use `.js` in imports (`import { x } from './foo.js'`) — required by NodeNext module resolution
- **Strict TypeScript:** No `any` except repository update methods (Drizzle partial type limitation)
- **Dates:** Always `YYYY-MM-DD` strings, never Date objects in storage. Use helpers from `src/utils/date.ts`
- **IDs:** 8-char alphanumeric via `generateId()` in `src/utils/id.ts`
- **Naming:** Files `kebab-case`, classes `PascalCase`, functions `camelCase`, DB columns `snake_case`, TS properties `camelCase`
- **Output:** Commands use `formatOutput(data, humanFormatter, { json })` to switch between JSON and human-readable. Context commands always output JSON directly.

## Error Handling

All domain errors extend `PlannerError` (`src/errors.ts`): `NotFoundError`, `ValidationError`, `NotInitializedError`. Caught at the CLI layer in `src/index.ts`. Services throw, commands catch.

## CLI Patterns

- Parent commands with subcommands must use `.passThroughOptions()` (Commander.js requirement)
- Root program uses `.enablePositionalOptions()` (prerequisite for passThroughOptions)
- Every command (except `init`) calls `ensureInitialized()` first
- Every command calls `getContainer()` to access services

## Database

- Schema source of truth: `src/db/schema.ts` (Drizzle table definitions)
- Migrations: `src/db/migrate.ts` — raw `CREATE TABLE IF NOT EXISTS` statements, run individually (Drizzle's `db.run()` only supports single statements)
- Foreign keys require `pragma('foreign_keys = ON')` — set in `src/db/connection.ts`
- Deleting areas/goals orphans children (`SET NULL`). Deleting goals cascades milestones. Deleting habits cascades completions.
- Drizzle queries: `.get()` for single row, `.all()` for arrays, `.run()` for mutations

## Testing

Three layers, all use Vitest with globals enabled (no imports needed for describe/it/expect):

| Layer | Pattern | Key helper |
|-------|---------|------------|
| **Unit** (`tests/unit/`) | Pure functions, no I/O | — |
| **Integration** (`tests/integration/`) | `createTestDb()` gives fresh in-memory SQLite per test | `tests/integration/helpers/db.ts` |
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

**New command:** Add service method → register CLI command with `ensureInitialized()` + `formatOutput()` → add integration + E2E tests.

**New entity:** schema.ts table → migrate.ts CREATE TABLE → repository → service → formatter → command → wire in container.ts → update context.service.ts → tests.

**Schema change:** Update schema.ts + add ALTER TABLE in migrate.ts. New columns must have defaults or be nullable.

## TUI Screenshots (VHS)

Use [VHS](https://github.com/charmbracelet/vhs) to capture TUI screenshots and GIFs. Requires `vhs`, `ttyd`, and `ffmpeg`.

```bash
vhs demo.tape              # run the tape → generates screenshots/ + demo.gif
```

The tape file (`demo.tape`) scripts terminal interactions: launches the TUI, navigates screens, and captures PNGs. Use `Hide`/`Show` to hide startup noise (npm output). Screenshots land in `screenshots/`.

Key patterns:
- `Set Shell "bash"` + `Hide` → `Type "clear && npx tsx src/index.ts tui --theme purple"` → `Enter` → `Sleep 5s` → `Show` — hides boot sequence
- `Type "2"` navigates to screen 2 (Areas), `Screenshot screenshots/02-areas.png` captures it
- TUI source: `src/tui/` (Ink + React), screens in `src/tui/screens/`, themes: neon, matrix, purple
