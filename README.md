# plan

A headless, terminal-based life planner. Organize life into areas, set goals, track tasks and habits, review progress — all from the command line.

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
- **AI-ready** — `plan context` commands return full JSON trees for agent integration
- **Export** — Snapshot your entire planner to a well-formatted Markdown file
- **Portable** — Single SQLite file, zero config, works offline

## Installation

### From source

```bash
git clone https://github.com/your-username/planner-cli.git
cd planner-cli
npm install
npm run build
npm link
```

### Requirements

- Node.js >= 18
- npm >= 9

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

## Configuration

| Environment variable | Default | Description |
|---------------------|---------|-------------|
| `PLANNER_HOME` | `~/.planner` | Directory for the database file |

The database is a single SQLite file at `$PLANNER_HOME/planner.db`.

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
| Database | SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| CLI framework | [Commander.js](https://github.com/tj/commander.js/) |
| IDs | [nanoid](https://github.com/ai/nanoid) (custom 8-char alphanumeric) |
| Testing | [Vitest](https://vitest.dev/) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, architecture overview, coding conventions, and how to submit changes.

## License

MIT
