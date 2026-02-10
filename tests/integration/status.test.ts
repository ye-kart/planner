import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from './helpers/db.js';
import { createTestContainer } from '../../src/container.js';
import { today } from '../../src/utils/date.js';
import type { DB } from '../../src/db/connection.js';

let db: DB;
let container: ReturnType<typeof createTestContainer>;

beforeEach(() => {
  db = createTestDb();
  container = createTestContainer(db);
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
