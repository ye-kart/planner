# plan

A headless life planner with CLI, terminal UI, and web interface. Organize life into areas, set goals, track tasks and habits, review progress — from the command line or the browser.

```
$ plan status

Today — Tue, Feb 10 2026

  Tasks due today          3
  Overdue tasks            1
  Habits due today         5 (2 done)
  Current best streak      14 days (Meditation)

Due Tasks:
  ! [urgent]  Finish tax filing         (due today)
  ● [high]    Review PR #42             (due today)
  ○ [medium]  Update README             (due today)
  ⚠ [high]    Submit report             (1 day overdue)

Habits:
  ✓ Meditation               streak: 14
  ✓ Read 30 min              streak: 7
  ○ Exercise                 streak: 3
  ○ Journal                  streak: 0
  ○ Study Spanish            streak: 11
```

## Features

- **Areas** — Organize your life into categories (Health, Career, Finance, etc.)
- **Goals** — Set outcomes with progress tracking and milestones
- **Tasks** — One-off actionable items with due dates and priorities
- **Habits** — Recurring activities with frequency scheduling and streak tracking
- **Dashboard** — Daily overview of what's due and how you're doing
- **AI Chat** — Embedded assistant that can read, create, and modify your plans via natural language
- **MCP server** — Connect external AI agents with revocable, space-bound read/write access
- **Document Import** — Feed the AI a Markdown file and get smart suggestions (no duplicates)
- **Web App** — Full-featured React SPA with the same 7 color themes, keyboard shortcuts, and AI chat
- **AI-ready** — `plan context` commands return full JSON trees for agent integration
- **Export** — Snapshot your entire planner to a well-formatted Markdown file
- **Portable** — Single SQLite file, zero config, works offline
- **Deployable** — Dockerfile + fly.toml for one-command deployment to fly.io

## Installation

### From source (CLI)

```bash
git clone https://github.com/your-username/planner-cli.git
cd planner-cli
pnpm install
pnpm build
pnpm link --global --filter @planner/cli
```

### Web app (local development)

```bash
pnpm install
pnpm dev:full     # Starts API server (port 3000) + Vite dev server (port 5173)
# Or run them separately:
pnpm dev:api      # API server only
pnpm dev:web      # Vite dev server only (proxies /api to localhost:3000)
```

### Deploy to fly.io

```bash
fly launch
fly volumes create planner_data --region iad --size 1
fly secrets set PLANNER_GITHUB_CLIENT_ID=... PLANNER_GITHUB_CLIENT_SECRET=... PLANNER_ALLOWED_GITHUB_USERS=... PLANNER_AI_API_KEY=...
fly deploy
```

### Requirements

- Node.js >= 20
- pnpm >= 9

## Quick start

```bash
# Initialize the database (seeds 10 default life areas)
plan init

# See your daily dashboard
plan status

# Add a goal under the Health area
plan areas                                    # find the Health area ID
plan goals add "Run a marathon" --area <id> --priority high --target-date 2026-06-01

# Break it down with milestones
plan goals ms add <goal-id> "Run 10K without stopping"
plan goals ms add <goal-id> "Complete half-marathon"
plan goals ms toggle <ms-id>                  # marks done, auto-updates progress

# Add tasks
plan tasks add "Buy running shoes" --goal <goal-id> --priority high --due 2026-03-01
plan tasks done <task-id>

# Track a habit
plan habits add "Morning run" --frequency specific_days --days 1,3,5 --goal <goal-id>
plan habits check <habit-id>                  # check off today
plan habits streaks                           # see all streaks
```

## Commands

Every command supports `--json` for machine-readable output.

### Setup

| Command | Description |
|---------|-------------|
| `plan init` | Initialize database and seed default areas |
| `plan status` | Today's dashboard: due tasks, habit check-ins, streaks |
| `plan export --output <path>` | Export all data to Markdown (or `--json` for JSON) |

### Areas

Life categories. Everything rolls up to an area.

```bash
plan areas                             # List all areas with stats
plan areas add <name>                  # Create area
plan areas add <name> --desc "..."     # Create with description
plan areas edit <id> --name "..."      # Rename
plan areas show <id>                   # Area detail: goals, tasks, habits
plan areas rm <id>                     # Delete (children get orphaned, not deleted)
```

### Goals

Finite outcomes with measurable progress.

```bash
plan goals                             # List all goals
plan goals --area <id> --status active # Filter by area and/or status
plan goals add <title>                 # Create goal
plan goals add <title> --area <id> --priority high --target-date 2026-06-01
plan goals show <id>                   # Detail: milestones, tasks, habits
plan goals edit <id> --title "..." --priority urgent
plan goals progress <id> 75            # Set progress manually (0-100)
plan goals done <id>                   # Mark complete (sets progress to 100%)
plan goals archive <id>                # Archive
plan goals rm <id>                     # Delete (cascades milestones)
```

#### Milestones

Checklist items nested under a goal. Toggling milestones auto-recalculates goal progress.

```bash
plan goals ms add <goal-id> "Step 1"   # Add milestone
plan goals ms toggle <ms-id>           # Toggle done/undone
plan goals ms rm <ms-id>               # Delete
```

### Tasks

One-off actionable items.

```bash
plan tasks                             # List all tasks
plan tasks --status todo --priority high  # Filter
plan tasks add <title>                 # Create task
plan tasks add <title> --area <id> --goal <id> --priority high --due 2026-03-01
plan tasks show <id>                   # Task detail
plan tasks edit <id> --status in_progress --priority urgent
plan tasks done <id>                   # Mark done (sets completedAt)
plan tasks start <id>                  # Mark in_progress
plan tasks rm <id>                     # Delete
plan tasks today                       # Tasks due today
plan tasks upcoming 14                 # Tasks due within N days
```

### Habits

Recurring activities with streak tracking.

```bash
plan habits                            # List active habits with streaks
plan habits --area <id>                # Filter by area
plan habits add <title>                # Create daily habit
plan habits add <title> --frequency weekly
plan habits add <title> --frequency specific_days --days 1,3,5  # Mon, Wed, Fri
plan habits show <id>                  # Detail: stats, recent completions
plan habits edit <id> --title "..."
plan habits check <id>                 # Check off today
plan habits check <id> 2026-02-09     # Check off a specific date
plan habits uncheck <id>               # Remove today's completion
plan habits uncheck <id> 2026-02-09   # Remove specific date
plan habits archive <id>               # Deactivate
plan habits restore <id>               # Reactivate
plan habits rm <id>                    # Delete (cascades completions)
plan habits streaks                    # Streak overview for all active habits
```

#### Frequency options

| Frequency | `--days` | Description |
|-----------|----------|-------------|
| `daily` | not needed | Every day |
| `weekly` | not needed | At least once per week |
| `specific_days` | required | Specific days (0=Sun, 1=Mon, ..., 6=Sat) |

#### Streak calculation

Streaks are frequency-aware:

- **Daily** — Consecutive calendar days backward from today. Grace period: yesterday counts if today isn't checked yet.
- **Weekly** — Consecutive ISO weeks with at least one completion.
- **Specific days** — Consecutive scheduled days with completions. Grace period for the most recent scheduled day.

### Context (AI agent API)

Returns nested JSON objects with all related entities resolved. Designed for AI agents that need full context in a single call. Always outputs JSON (no `--json` flag needed).

```bash
plan context goal <id>    # Goal + area + milestones + tasks + habits
plan context area <id>    # Area + all nested children
plan context task <id>    # Task + area + goal (with progress)
plan context habit <id>   # Habit + area + goal + recent completions
plan context today        # Full today snapshot
plan context all          # Complete state tree
```

<details>
<summary>Example: <code>plan context goal &lt;id&gt;</code></summary>

```json
{
  "goal": {
    "id": "JHURp5b8",
    "title": "Run a marathon",
    "status": "active",
    "progress": 40,
    "priority": "high",
    "targetDate": "2026-06-01",
    "area": { "id": "7H489JbR", "name": "Health" },
    "milestones": [
      { "id": "73WWu2wr", "title": "Run 10K without stopping", "done": true },
      { "id": "G27M9c2M", "title": "Complete half-marathon", "done": false }
    ],
    "tasks": [
      { "id": "v6TWCB5f", "title": "Buy running shoes", "status": "done", "priority": "high", "dueDate": null }
    ],
    "habits": [
      { "id": "YPgXxJSu", "title": "Morning run", "frequency": "specific_days", "days": [1,3,5], "currentStreak": 12, "bestStreak": 30, "active": true }
    ]
  }
}
```

</details>

<details>
<summary>Example: <code>plan context all</code></summary>

```json
{
  "areas": [
    {
      "id": "...",
      "name": "Health",
      "goals": [
        {
          "id": "...",
          "title": "Run a marathon",
          "milestones": [...],
          "tasks": [...],
          "habits": [...]
        }
      ],
      "tasks": [...],
      "habits": [...]
    }
  ],
  "unlinked": {
    "goals": [...],
    "tasks": [...],
    "habits": [...]
  }
}
```

The `unlinked` key holds items with no `areaId` — orphaned or quick-captured items.

</details>

### Export

Snapshot your entire planner to a formatted Markdown or JSON file.

```bash
plan export --output ./planner.md         # Formatted Markdown
plan export --output ./data.json --json   # JSON dump
```

The Markdown export organizes data hierarchically — areas, goals (with progress tables and milestone checklists), tasks, and habits with streak info. Useful for sharing, version control, or offline review.

<details>
<summary>Example Markdown output</summary>

```markdown
# Planner Export

> Exported on Sat, Feb 14 2026

---

## Health

> Physical wellness

### Goals

#### Run a marathon

| Status | Progress | Priority | Target |
|--------|----------|----------|--------|
| active | ████░░░░░░ 40% | high | 2026-06-01 |

**Milestones**

- [x] Run 10K without stopping
- [ ] Complete half-marathon

**Tasks**

- [x] **high** Buy running shoes — due 2026-03-01
- [ ] **medium** Sign up for race

**Habits**

- Morning run (Mon, Wed, Fri) — streak: 12 / best: 30
```

</details>

### AI Chat (TUI & Web)

Both the TUI and web app include an embedded AI assistant that can read, create, and modify your planning data through natural conversation. Press `c` to open the chat panel in either interface.

```bash
plan tui                              # Launch the terminal UI, press 'c' for chat
# Or use the web app — chat panel slides out from the right
```

The assistant has access to 23 tools covering areas, goals, tasks, habits, milestones, and document reading. It sees your full planner state and today's summary in every message. The web app streams responses via SSE (Server-Sent Events).

#### Document analysis

Ask the AI to analyze an external Markdown file — it will compare against your current data and suggest new items without duplicates:

```
> analyze the document at .local/planner.md and suggest what I should add
```

The AI reads the file, compares it with existing goals/tasks/habits, and presents suggestions organized as NEW, EXISTS, or UPDATE — then waits for your confirmation before creating anything.

Supported file types: `.md`, `.txt`, `.json`, `.csv`, `.yaml`, `.yml`

Works with any OpenAI-compatible API, including Ollama — see [Configuration](#configuration) for env vars.

#### Free trial & subscriptions (web app)

New users get **7 days of free AI access** on their first login. When the trial runs out, AI chat returns `402 Payment Required` and the UI prompts the user to subscribe. Planned pricing: **€1/month** or **€10/year** for unlimited AI usage. Admins (users marked `is_admin=1` in `allowed_users`) always bypass the gate.

Endpoints:

- `GET /api/auth/me` — includes `trial` state (`trial` / `trial_expired` / `active` / `admin`) and days remaining
- `GET /api/auth/trial` — standalone trial status

Payment processing is not yet wired up — the trial ships first so the full login→use→paywall flow can be exercised end-to-end before money moves.

## MCP server (external AI agents)

Planner exposes a remote [Model Context Protocol](https://modelcontextprotocol.io/) endpoint at `/mcp`. Compatible agents can read and manage one Planner space using an explicit grant created by a signed-in Planner user.

### Connect an agent

1. In the web app, open **Agent access** for the space you want to share.
2. Name the connection, choose **Read**, **Write**, or both, and select a 7, 30, or 90 day expiry.
3. Create the connection and copy the token immediately. Planner stores only its SHA-256 hash and cannot show the secret again.
4. Configure the agent with the displayed MCP resource URL and send the token in every request:

```http
Authorization: Bearer pln_mcp_...
```

A representative client configuration looks like this (exact keys vary by agent):

```json
{
  "mcpServers": {
    "planner": {
      "type": "http",
      "url": "https://planner.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${PLANNER_MCP_TOKEN}"
      }
    }
  }
}
```

Keep the token in the client’s secret store or an environment variable, not in source control. Revoke it at any time from **Agent access**.

This first release uses user-created bearer grants. The client must support a custom `Authorization` header; automatic OAuth discovery and browser consent are not implemented yet.

### Permissions and tools

Each grant is bound to exactly one space and the configured `/mcp` resource URL.

| Scope | Tools |
|-------|-------|
| `planner:read` | `get_today`, list/get areas, goals, tasks, and habits |
| `planner:write` | Create/update areas, goals, tasks, and habits; set goal progress; add/set milestones; set habit completion |

The MCP server deliberately does **not** expose permanent deletion, space management, AI chat, conversation history, or local file/document access. List and today-status collections are limited to 100 items per call; related collections in detail responses are capped at 100, habit details include at most 30 recent completions, and HTTP request bodies are capped at 256 KiB.

Authentication errors use HTTP `401` for a missing, malformed, expired, revoked, or wrong-resource token. Invalid browser origins and hosts are rejected with `403`. Domain validation failures are returned as MCP tool errors without stack traces.

### Server configuration

Production must set the canonical HTTPS endpoint before users can create grants:

```bash
PLANNER_MCP_RESOURCE_URL=https://planner.example.com/mcp
```

The resource hostname is automatically allowed. Add comma-separated hostnames only when a trusted proxy or browser client uses another hostname:

```bash
PLANNER_MCP_ALLOWED_HOSTS=internal-proxy.example.com
PLANNER_MCP_ALLOWED_ORIGINS=trusted-agent.example.com
```

In local development the default is `http://localhost:3000/mcp`. MCP access is disabled in production when `PLANNER_MCP_RESOURCE_URL` is missing or invalid. The conventional management API is `GET/POST /api/mcp/tokens` and `DELETE /api/mcp/tokens/:id`; it accepts only the signed-in user’s own grants.

The included Fly deployment sets this to `https://ye-planner.fly.dev/mcp` in `fly.toml`, so MCP runs in the same application, process, database, and monitoring surface as the existing Planner API.

## JSON output

Every command (except `context`, which is always JSON) supports `--json`:

```bash
plan areas --json
plan goals add "My Goal" --json
plan tasks --status todo --json
```

This makes it easy to pipe into `jq`, scripts, or other tools:

```bash
# Get all high-priority tasks due this week
plan tasks --priority high --json | jq '.[] | select(.dueDate != null)'

# Count active goals per area
plan goals --status active --json | jq 'group_by(.areaId) | map({area: .[0].areaId, count: length})'
```

## Web App

The web app replicates all 5 screens from the TUI — Dashboard, Areas, Goals, Tasks, Habits — with the same 7 color themes and keyboard-driven navigation.

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `1`–`5` | Navigate to screen |
| `Tab`/`Shift+Tab` | Next/previous screen |
| `t` | Cycle theme |
| `c` | Toggle AI chat |
| `/` | Search |
| `j`/`k` | Navigate list |
| `Enter` | View detail |
| `n` | New item |
| `e` | Edit selected |
| `x` | Delete (with confirmation) |
| `d` | Mark done |
| `s` | Start task |
| `f`/`F` | Cycle filters |
| `Space` | Toggle habit/milestone |
| `Backspace` | Back to list |
| `Escape` | Close overlay |

Single-character shortcuts are suppressed when an input field is focused.

### Themes

7 themes available — neon, matrix, purple, ember, frost, sakura, aurora. Press `t` to cycle. Theme preference persists to localStorage.

### Authentication

Planner supports GitHub OAuth, Google OAuth, and email/password sign-in. Configure at least one provider to require authentication. Email/password registration uses Resend and requires email verification before a user can sign in; password-reset links expire after one hour.

## Configuration

| Environment variable | Default | Description |
|---------------------|---------|-------------|
| `PLANNER_HOME` | `~/.planner` | Directory for the database file |
| `PLANNER_AI_API_KEY` | — | API key (required for AI chat) |
| `PLANNER_AI_BASE_URL` | `https://api.openai.com/v1` | API base URL (set to `http://localhost:11434/v1` for Ollama) |
| `PLANNER_AI_MODEL` | `gpt-4o` | Model name (e.g., `mistral` for Ollama) |
| `PLANNER_GITHUB_CLIENT_ID` | — | GitHub OAuth app client ID (enables web auth) |
| `PLANNER_GITHUB_CLIENT_SECRET` | — | GitHub OAuth app client secret |
| `PLANNER_ALLOWED_GITHUB_USERS` | — | Comma-separated GitHub usernames allowed to log in |
| `PLANNER_GOOGLE_CLIENT_ID` | — | Google OAuth client ID |
| `PLANNER_GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret |
| `PLANNER_RESEND_API_KEY` | — | Resend API key for verification and reset emails |
| `PLANNER_EMAIL_FROM` | — | Verified sender, e.g. `Planner <accounts@example.com>` |
| `PLANNER_MCP_RESOURCE_URL` | local `/mcp` URL; required in production | Canonical HTTPS MCP endpoint used for token audience binding |
| `PLANNER_MCP_ALLOWED_HOSTS` | resource hostname | Additional trusted MCP request hostnames |
| `PLANNER_MCP_ALLOWED_ORIGINS` | resource hostname | Additional trusted browser-origin hostnames |
| `PORT` | `3000` | API server port |

The database is a single SQLite file at `$PLANNER_HOME/planner.db`.

**Ollama example:**

```bash
PLANNER_AI_API_KEY=ollama \
PLANNER_AI_BASE_URL=http://localhost:11434/v1 \
PLANNER_AI_MODEL=mistral \
plan tui
```

## Data model

```
Areas
├── Goals (progress, milestones, target dates)
│   ├── Milestones (checklist items, auto-progress)
│   ├── Tasks (linked to goal)
│   └── Habits (linked to goal)
├── Tasks (area-level)
└── Habits (area-level)
```

### Key behaviors

- **Orphaning, not cascading** — Deleting an area or goal nullifies the foreign key on children. Nothing is cascade-deleted except milestones (tied to their goal) and completions (tied to their habit).
- **Auto-progress** — When milestones exist, toggling them recalculates goal progress as `(done / total) * 100`.
- **completedAt management** — Moving a task to `done` sets `completedAt`. Moving it away clears it.
- **8-character IDs** — Alphanumeric nanoid. CLI-friendly, collision-safe for personal use.

## Tech stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript (strict mode) |
| Monorepo | pnpm workspaces (6 packages — see below) |
| Database | SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| CLI framework | [Commander.js](https://github.com/tj/commander.js/) |
| TUI framework | [Ink](https://github.com/vadimdemedes/ink) (React for CLI) |
| API server | [Hono](https://hono.dev/) + @hono/node-server |
| Agent integration | MCP Streamable HTTP via the official TypeScript SDK |
| Web frontend | React + [Vite](https://vite.dev/) + [Tailwind CSS v4](https://tailwindcss.com/) |
| UI components | [shadcn/ui](https://ui.shadcn.com/) |
| Server state | [TanStack Query v5](https://tanstack.com/query) |
| Client state | [Zustand](https://zustand.docs.pmnd.rs/) |
| Auth | GitHub OAuth + session cookies |
| IDs | [nanoid](https://github.com/ai/nanoid) (custom 8-char alphanumeric) |
| Testing | [Vitest](https://vitest.dev/) |
| Deployment | Docker + [fly.io](https://fly.io/) |

### Packages

```
packages/
  core/  → @planner/core  — headless engine (zero UI deps)
  ai/    → @planner/ai    — AI chat service, tools, prompt (UI-agnostic)
  cli/   → @planner/cli   — Commander.js CLI
  tui/   → @planner/tui   — Ink/React terminal UI
  api/   → @planner/api   — Hono REST API server
  web/   → @planner/web   — React SPA (Vite + Tailwind v4)
```

Dependency graph: `cli → tui → ai → core`, `api → ai → core`, `web` (standalone SPA, talks to api over HTTP).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, architecture overview, coding conventions, and how to submit changes.

## License

MIT
