# Contributing to Planner CLI

Thanks for your interest in contributing! This guide covers everything you need to get started: development setup, architecture overview, coding conventions, testing, and the pull request process.

## Table of contents

- [Development setup](#development-setup)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [Coding conventions](#coding-conventions)
- [Testing](#testing)
- [Adding a new command](#adding-a-new-command)
- [Adding a new entity](#adding-a-new-entity)
- [Database changes](#database-changes)
- [Pull request process](#pull-request-process)
- [Issue guidelines](#issue-guidelines)
- [Code of conduct](#code-of-conduct)

---

## Development setup

### Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **Git**

### Getting started

```bash
# Clone the repo
git clone https://github.com/your-username/planner-cli.git
cd planner-cli

# Install dependencies
npm install

# Run in development mode (uses tsx, no build step)
npx tsx src/index.ts init
npx tsx src/index.ts areas

# Type-check
npm run lint

# Run the test suite
npm test

# Build for production
npm run build
```

### Useful scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `tsx src/index.ts` | Run CLI without building |
| `npm run build` | `tsc` | Compile TypeScript to `dist/` |
| `npm run lint` | `tsc --noEmit` | Type-check without emitting |
| `npm test` | `vitest run` | Run full test suite |
| `npm run test:watch` | `vitest` | Run tests in watch mode |

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PLANNER_HOME` | `~/.planner` | Database directory. Set this for testing to avoid touching your real data. |

```bash
# Use a throwaway database during development
export PLANNER_HOME=/tmp/planner-dev
npx tsx src/index.ts init
```

---

## Project structure

```
src/
  index.ts                    # Entry point — Commander program setup
  container.ts                # Dependency injection wiring (lazy singletons)
  errors.ts                   # PlannerError hierarchy
  db/
    schema.ts                 # Drizzle table definitions (source of truth for DB schema)
    connection.ts             # getDb() — SQLite connection management
    migrate.ts                # Programmatic migration runner (CREATE TABLE statements)
    seed.ts                   # Default area seeding
  repositories/               # Data access layer — one file per table
    area.repository.ts
    goal.repository.ts
    milestone.repository.ts
    task.repository.ts
    habit.repository.ts
    completion.repository.ts
  services/                   # Business logic layer
    init.service.ts           # Database initialization + seeding
    area.service.ts           # Area CRUD + stats
    goal.service.ts           # Goal CRUD + milestone operations + progress recalculation
    task.service.ts           # Task CRUD + completedAt auto-management
    habit.service.ts          # Habit CRUD + check/uncheck + streak persistence
    streak.ts                 # Pure function: calculateStreaks()
    context.service.ts        # Full entity graph assembly (for AI agents)
    status.service.ts         # Dashboard data aggregation
  commands/                   # CLI layer — one file per command group
    index.ts                  # registerCommands() — wires all commands
    init.command.ts
    status.command.ts
    areas.command.ts
    goals.command.ts          # Includes nested `ms` sub-subcommand
    tasks.command.ts
    habits.command.ts
    context.command.ts        # Always outputs JSON (no --json flag)
  formatters/                 # Human-readable output formatters
    area.formatter.ts
    goal.formatter.ts
    task.formatter.ts
    habit.formatter.ts
    status.formatter.ts
  utils/                      # Shared utilities
    id.ts                     # generateId() — 8-char alphanumeric nanoid
    paths.ts                  # PLANNER_HOME / DB_PATH resolution
    date.ts                   # Date helpers (YYYY-MM-DD, no timezone drift)
    output.ts                 # formatOutput() — switches between JSON and human
    guard.ts                  # ensureInitialized() — checks DB file exists
tests/
  unit/                       # Pure function tests (no I/O)
  integration/                # Service tests with in-memory SQLite
    helpers/db.ts             # createTestDb() — in-memory DB factory
  e2e/                        # Full CLI tests (spawns real processes)
    helpers/cli.ts            # runCli() / runCliJson() test helpers
```

---

## Architecture

### Layered architecture

The codebase follows a strict layered architecture. Each layer only depends on the one below it:

```
CLI Commands         ← Parses args, calls services, formats output
    ↓
Services             ← Business logic, validation, orchestration
    ↓
Repositories         ← Data access (Drizzle queries)
    ↓
Database             ← SQLite via better-sqlite3
```

**Rules:**
- Commands never import repositories directly.
- Repositories never contain business logic.
- Services never import Commander or formatting code.
- The `container.ts` file wires everything together with constructor injection.

### Dependency injection

No DI framework. Constructor injection with lazy singletons wired in `src/container.ts`:

```typescript
// Production: uses real SQLite file
const container = getContainer();

// Testing: uses in-memory SQLite
const container = createTestContainer(createTestDb());
```

This makes every service fully testable without mocking.

### Synchronous API

better-sqlite3 is synchronous. There is no `async/await` in repositories or services. This simplifies the codebase significantly — no Promise chains, no async error handling. CLI commands are also synchronous.

### Error handling

All domain errors extend `PlannerError`:

| Error class | When thrown |
|-------------|------------|
| `NotFoundError` | Entity lookup by ID fails |
| `ValidationError` | Input validation fails (length, enum, range) |
| `NotInitializedError` | DB file missing (`plan init` not run) |

Errors are caught at the CLI layer in `src/index.ts` and printed to stderr.

### Output strategy

Commands return structured data from services. The `formatOutput()` utility switches between JSON and human-readable based on the `--json` flag:

```typescript
console.log(formatOutput(data, formatAreaList, { json: opts.json }));
```

The `context` commands always output JSON directly — no formatter needed.

### ID generation

8-character alphanumeric IDs generated with a custom alphabet via `crypto.getRandomValues()`. This is CLI-friendly (easy to type, copy, tab-complete) and collision-safe for a personal tool.

---

## Coding conventions

### TypeScript

- **Strict mode** is enabled. Do not use `any` unless absolutely necessary (repository update methods are the exception due to Drizzle's partial update types).
- Prefer explicit return types on public service methods.
- Use `.js` extensions in imports (required by NodeNext module resolution).

### Naming

| Item | Convention | Example |
|------|-----------|---------|
| Files | `kebab-case` | `area.service.ts`, `goal.formatter.ts` |
| Classes | `PascalCase` | `AreaService`, `GoalRepository` |
| Functions | `camelCase` | `calculateStreaks`, `formatOutput` |
| DB columns | `snake_case` | `area_id`, `target_date`, `completed_at` |
| TS properties | `camelCase` | `areaId`, `targetDate`, `completedAt` |

### Formatting

- 2-space indentation.
- Single quotes for strings.
- No semicolons (the codebase uses them — be consistent with existing code in the file you're editing).
- Trailing commas in multi-line arrays/objects.

### Commit messages

- Use imperative mood: "Add habit archiving" not "Added habit archiving".
- Keep the subject line under 72 characters.
- Reference issue numbers when applicable: "Fix streak calculation for weekly habits (#42)".

---

## Testing

### Test layers

| Layer | Directory | Speed | What it tests |
|-------|-----------|-------|---------------|
| **Unit** | `tests/unit/` | ~20ms | Pure functions (date utils, streak calculation) |
| **Integration** | `tests/integration/` | ~100ms | Services with in-memory SQLite |
| **E2E** | `tests/e2e/` | ~25s | Full CLI via `execSync` with real filesystem |

### Running tests

```bash
# Full suite
npm test

# Specific layer
npx vitest run tests/unit
npx vitest run tests/integration
npx vitest run tests/e2e

# Watch mode (re-runs on file change)
npm run test:watch

# Single file
npx vitest run tests/unit/streak.test.ts
```

### Writing integration tests

Integration tests use an in-memory SQLite database. No filesystem, no cleanup:

```typescript
import { createTestDb } from './helpers/db.js';

let db: DB;
let service: AreaService;

beforeEach(() => {
  db = createTestDb();  // Fresh in-memory DB with migrations applied
  const areaRepo = new AreaRepository(db);
  // ... wire up the service
  service = new AreaService(areaRepo, goalRepo, taskRepo, habitRepo);
});

it('creates an area', () => {
  const area = service.add('Health');
  expect(area.name).toBe('Health');
});
```

Or use the test container for broader tests:

```typescript
import { createTestContainer } from '../../src/container.js';

let container: ReturnType<typeof createTestContainer>;

beforeEach(() => {
  container = createTestContainer(createTestDb());
});

it('status includes due tasks', () => {
  container.taskService.add('Task', { dueDate: today() });
  const status = container.statusService.getStatus();
  expect(status.summary.tasksDue).toBe(1);
});
```

### Writing E2E tests

E2E tests spawn real CLI processes. Each test gets an isolated temp directory:

```typescript
import { setupTestDir, cleanupTestDir, runCli, runCliJson } from './helpers/cli.js';

let testDir: string;
beforeEach(() => {
  testDir = setupTestDir();
  runCli('init', testDir);
});
afterEach(() => cleanupTestDir(testDir));

it('creates a task', () => {
  const task = runCliJson('tasks add "Buy groceries" --priority high', testDir);
  expect(task.title).toBe('Buy groceries');
  expect(task.priority).toBe('high');
});
```

For `context` commands (which always output JSON without `--json`), use `runCliParseJson`:

```typescript
const ctx = runCliParseJson(`context goal ${goalId}`, testDir);
expect(ctx.goal.title).toBe('My Goal');
```

### Test expectations

- All PRs must pass the full test suite (`npm test`).
- New features should include integration tests at minimum.
- Bug fixes should include a regression test.
- Type-checking must pass (`npm run lint`).

---

## Adding a new command

Example: adding a `plan goals reopen <id>` command.

### 1. Add the service method

```typescript
// src/services/goal.service.ts
reopen(id: string): Goal {
  const goal = this.goalRepo.findById(id);
  if (!goal) throw new NotFoundError('Goal', id);
  return this.goalRepo.update(id, { status: 'active' })!;
}
```

### 2. Register the CLI command

```typescript
// src/commands/goals.command.ts (inside registerGoalsCommand)
goals
  .command('reopen <id>')
  .description('Reopen an archived or done goal')
  .option('--json', 'Output as JSON')
  .action((id, opts) => {
    ensureInitialized();
    const { goalService } = getContainer();
    const goal = goalService.reopen(id);
    console.log(formatOutput(goal, formatGoal, opts));
  });
```

### 3. Add tests

- **Integration test** in `tests/integration/goal.test.ts`
- **E2E test** in `tests/e2e/goals.test.ts`

### 4. Update documentation

- Update `README.md` command tables if needed.

---

## Adding a new entity

To add a completely new entity (e.g., "Notes"):

1. **Schema** — Add the table in `src/db/schema.ts` with Drizzle.
2. **Migration** — Add the `CREATE TABLE` statement in `src/db/migrate.ts`.
3. **Repository** — Create `src/repositories/note.repository.ts` following existing patterns.
4. **Service** — Create `src/services/note.service.ts` with validation and business logic.
5. **Formatter** — Create `src/formatters/note.formatter.ts`.
6. **Command** — Create `src/commands/notes.command.ts` and register it in `src/commands/index.ts`.
7. **Container** — Wire the new repository and service in `src/container.ts`.
8. **Context** — Update `src/services/context.service.ts` if the entity should appear in the AI context API.
9. **Tests** — Add integration and E2E tests.

---

## Database changes

### Schema changes

The schema source of truth is `src/db/schema.ts` (Drizzle table definitions). The actual SQL lives in `src/db/migrate.ts` as `CREATE TABLE IF NOT EXISTS` statements.

For new tables:
1. Add the Drizzle table definition in `schema.ts`.
2. Add the corresponding `CREATE TABLE` SQL in `migrate.ts`.
3. Export the types in `schema.ts`.

For column additions to existing tables:
1. Update the Drizzle table definition in `schema.ts`.
2. Add an `ALTER TABLE` statement in `migrate.ts` (run after the initial creates).
3. Consider backward compatibility — new columns should have defaults or be nullable.

### Testing migrations

Migrations run automatically in integration tests via `createTestDb()`. To test manually:

```bash
export PLANNER_HOME=/tmp/planner-migration-test
npx tsx src/index.ts init
# Inspect the DB
sqlite3 /tmp/planner-migration-test/planner.db ".schema"
```

---

## Pull request process

### Before submitting

1. **Create an issue first** for non-trivial changes. Discuss the approach before investing time.
2. **Branch from `main`**. Use descriptive branch names: `feat/habit-notes`, `fix/streak-weekly-grace`.
3. **Keep PRs focused**. One feature or fix per PR. Small PRs get reviewed faster.

### PR checklist

- [ ] All tests pass (`npm test`)
- [ ] Type-checking passes (`npm run lint`)
- [ ] New features have integration tests
- [ ] Bug fixes have regression tests
- [ ] README updated for user-facing changes
- [ ] Commit messages are clear and descriptive

### Review process

1. Submit your PR with a clear description of what changed and why.
2. A maintainer will review within a few days.
3. Address review feedback with additional commits (don't force-push during review).
4. Once approved, the PR will be squash-merged.

### Branch naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<short-description>` | `feat/habit-notes` |
| Bug fix | `fix/<short-description>` | `fix/streak-off-by-one` |
| Docs | `docs/<short-description>` | `docs/api-examples` |
| Refactor | `refactor/<short-description>` | `refactor/service-di` |

---

## Issue guidelines

### Bug reports

Please include:
- **Steps to reproduce** — exact commands you ran.
- **Expected behavior** — what you thought would happen.
- **Actual behavior** — what actually happened (include full output).
- **Environment** — Node.js version, OS, `plan --version`.

### Feature requests

Please include:
- **Use case** — what problem does this solve?
- **Proposed CLI interface** — what would the commands look like?
- **Alternatives considered** — other approaches you thought about.

---

## Code of conduct

Be kind, be constructive, be patient. We're all here to build something useful.

- Treat everyone with respect.
- Assume good intentions.
- Focus on the code, not the person.
- Welcome newcomers warmly.

---

## Questions?

Open an issue or start a discussion. We're happy to help you get started.
