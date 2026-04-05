import { sql } from 'drizzle-orm';
import type { DB } from './connection.js';
import { generateId } from '../utils/id.js';
import { today } from '../utils/date.js';

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS spaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS areas (
    id TEXT PRIMARY KEY,
    space_id TEXT REFERENCES spaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    space_id TEXT REFERENCES spaces(id) ON DELETE CASCADE,
    area_id TEXT REFERENCES areas(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'done', 'archived')),
    progress INTEGER NOT NULL DEFAULT 0,
    target_date TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent'))
  )`,
  `CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    space_id TEXT REFERENCES spaces(id) ON DELETE CASCADE,
    area_id TEXT REFERENCES areas(id) ON DELETE SET NULL,
    goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TEXT,
    completed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    space_id TEXT REFERENCES spaces(id) ON DELETE CASCADE,
    area_id TEXT REFERENCES areas(id) ON DELETE SET NULL,
    goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'daily' CHECK(frequency IN ('daily', 'weekly', 'specific_days')),
    days TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    last_completed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS completions (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    note TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS completions_habit_date_idx ON completions(habit_id, date)`,
  `CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    space_id TEXT REFERENCES spaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant', 'tool')),
    content TEXT,
    tool_call_id TEXT,
    tool_calls TEXT,
    created_at TEXT NOT NULL,
    position INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id, position)`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
];

// ALTER statements for migrating existing databases that lack the space_id column.
// These are wrapped in try-catch because ALTER TABLE ADD COLUMN throws if the column already exists.
const ALTERS = [
  `ALTER TABLE areas ADD COLUMN space_id TEXT REFERENCES spaces(id) ON DELETE CASCADE`,
  `ALTER TABLE goals ADD COLUMN space_id TEXT REFERENCES spaces(id) ON DELETE CASCADE`,
  `ALTER TABLE tasks ADD COLUMN space_id TEXT REFERENCES spaces(id) ON DELETE CASCADE`,
  `ALTER TABLE habits ADD COLUMN space_id TEXT REFERENCES spaces(id) ON DELETE CASCADE`,
  `ALTER TABLE conversations ADD COLUMN space_id TEXT REFERENCES spaces(id) ON DELETE CASCADE`,
];

export function runMigrations(db: DB): void {
  for (const stmt of STATEMENTS) {
    db.run(sql.raw(stmt));
  }

  // Run ALTER statements for existing databases (ignore "duplicate column" errors)
  for (const alter of ALTERS) {
    try {
      db.run(sql.raw(alter));
    } catch {
      // Column already exists — safe to ignore
    }
  }

  // Backfill: create a default space and assign orphaned rows
  backfillDefaultSpace(db);
}

function backfillDefaultSpace(db: DB): void {
  const existing = db.all(sql`SELECT id FROM spaces LIMIT 1`);
  if (existing.length > 0) return; // Spaces already exist

  const id = generateId();
  const now = today();

  db.run(sql`INSERT INTO spaces (id, name, icon, position, created_at) VALUES (${id}, 'Personal', '🚀', 0, ${now})`);

  // Backfill all rows that have no space_id
  db.run(sql`UPDATE areas SET space_id = ${id} WHERE space_id IS NULL`);
  db.run(sql`UPDATE goals SET space_id = ${id} WHERE space_id IS NULL`);
  db.run(sql`UPDATE tasks SET space_id = ${id} WHERE space_id IS NULL`);
  db.run(sql`UPDATE habits SET space_id = ${id} WHERE space_id IS NULL`);
  db.run(sql`UPDATE conversations SET space_id = ${id} WHERE space_id IS NULL`);
}
