import { sql } from 'drizzle-orm';
import type { DB } from './connection.js';
import { generateId } from '../utils/id.js';
import { normalizeUsername } from '../utils/identity.js';
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
  `CREATE TABLE IF NOT EXISTS allowed_users (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'github',
    username TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS user_trials (
    user_id TEXT PRIMARY KEY,
    trial_started_at TEXT NOT NULL,
    trial_expires_at TEXT NOT NULL,
    subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK(subscription_status IN ('trial', 'active', 'expired', 'cancelled', 'past_due')),
    plan TEXT CHECK(plan IN ('monthly', 'yearly')),
    subscription_expires_at TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
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
  `ALTER TABLE user_trials ADD COLUMN stripe_customer_id TEXT`,
  `ALTER TABLE user_trials ADD COLUMN stripe_subscription_id TEXT`,
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

  // Normalize any pre-existing allowlist rows (idempotent: LOWER + TRIM + strip leading @)
  normalizeAllowedUsers(db);

  // Seed allowed_users from env vars if table is empty
  seedAllowedUsersFromEnv(db);
}

function normalizeAllowedUsers(db: DB): void {
  db.run(sql`UPDATE allowed_users SET username = LOWER(TRIM(username)) WHERE username != LOWER(TRIM(username))`);
  db.run(sql`UPDATE allowed_users SET username = SUBSTR(username, 2) WHERE username LIKE '@%'`);
}

function seedAllowedUsersFromEnv(db: DB): void {
  const existing = db.all(sql`SELECT id FROM allowed_users LIMIT 1`);
  if (existing.length > 0) return; // Already seeded

  const now = new Date().toISOString();

  // Seed GitHub users
  const githubUsers = (process.env.PLANNER_ALLOWED_GITHUB_USERS ?? '').split(',').map(normalizeUsername).filter(Boolean);
  for (let i = 0; i < githubUsers.length; i++) {
    const id = generateId();
    const isAdmin = i === 0 ? 1 : 0; // First user is admin
    db.run(sql`INSERT INTO allowed_users (id, provider, username, is_admin, created_at) VALUES (${id}, 'github', ${githubUsers[i]}, ${isAdmin}, ${now})`);
  }

  // Seed Google emails
  const googleEmails = (process.env.PLANNER_ALLOWED_GOOGLE_EMAILS ?? '').split(',').map(normalizeUsername).filter(Boolean);
  for (const email of googleEmails) {
    const id = generateId();
    const isAdmin = githubUsers.length === 0 ? 1 : 0; // Admin if no GitHub users were added
    db.run(sql`INSERT INTO allowed_users (id, provider, username, is_admin, created_at) VALUES (${id}, 'google', ${email}, ${isAdmin}, ${now})`);
  }
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
