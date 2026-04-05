import { createMemoryDb, runMigrations, generateId, SpaceRepository, type DB } from '@planner/core';

export function createTestDb(): DB {
  const db = createMemoryDb();
  runMigrations(db);
  return db;
}

export function createTestSpace(db: DB): string {
  const spaceRepo = new SpaceRepository(db);
  const space = spaceRepo.create({
    id: generateId(),
    name: 'Test Space',
    icon: '🧪',
    position: 0,
    createdAt: '2025-01-01',
  });
  return space.id;
}
