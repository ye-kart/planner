import { mkdirSync } from 'fs';
import { dirname } from 'path';
import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { getDbPath } from '../utils/paths.js';

export type DB = BetterSQLite3Database<typeof schema>;

let _db: DB | null = null;

export function getDb(): DB {
  if (!_db) {
    const dbPath = getDbPath();
    mkdirSync(dirname(dbPath), { recursive: true });
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

export function createMemoryDb(): DB {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
}

export function resetDb(): void {
  _db = null;
}
