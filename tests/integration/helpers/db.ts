import { createMemoryDb, runMigrations, type DB } from '@planner/core';

export function createTestDb(): DB {
  const db = createMemoryDb();
  runMigrations(db);
  return db;
}
