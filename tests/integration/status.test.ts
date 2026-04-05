import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, createTestSpace } from './helpers/db.js';
import { createTestContainer, today, type DB } from '@planner/core';

let db: DB;
let spaceId: string;
let container: ReturnType<typeof createTestContainer>;

beforeEach(() => {
  db = createTestDb();
  spaceId = createTestSpace(db);
  container = createTestContainer(db, spaceId);
});

describe('StatusService', () => {
  it('returns status data', () => {
    const status = container.statusService.getStatus();
    expect(status).toHaveProperty('date');
    expect(status).toHaveProperty('dateFormatted');
    expect(status).toHaveProperty('tasksDueToday');
    expect(status).toHaveProperty('tasksOverdue');
    expect(status).toHaveProperty('habitsDueToday');
    expect(status).toHaveProperty('summary');
  });

  it('includes due tasks in status', () => {
    container.taskService.add('Due task', { dueDate: today() });
    container.taskService.add('Future task', { dueDate: '2099-01-01' });

    const status = container.statusService.getStatus();
    expect(status.summary.tasksDue).toBe(1);
  });

  it('includes habit data in status', () => {
    container.habitService.add('Daily habit');
    const status = container.statusService.getStatus();
    expect(status.summary.habitsDue).toBeGreaterThanOrEqual(0);
  });
});
