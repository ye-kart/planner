import { createMemoryDb, type DB } from '../../../src/db/connection.js';
import { runMigrations } from '../../../src/db/migrate.js';

export function createTestDb(): DB {
  const db = createMemoryDb();
  runMigrations(db);
  return db;
}
