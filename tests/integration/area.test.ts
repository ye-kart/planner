import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from './helpers/db.js';
import { AreaRepository } from '../../src/repositories/area.repository.js';
import { GoalRepository } from '../../src/repositories/goal.repository.js';
import { TaskRepository } from '../../src/repositories/task.repository.js';
import { HabitRepository } from '../../src/repositories/habit.repository.js';
import { AreaService } from '../../src/services/area.service.js';
import type { DB } from '../../src/db/connection.js';

let db: DB;
let service: AreaService;

beforeEach(() => {
  db = createTestDb();
  const areaRepo = new AreaRepository(db);
  const goalRepo = new GoalRepository(db);
  const taskRepo = new TaskRepository(db);
  const habitRepo = new HabitRepository(db);
  service = new AreaService(areaRepo, goalRepo, taskRepo, habitRepo);
});

describe('AreaService', () => {
  it('creates an area', () => {
    const area = service.add('Health', 'Physical wellness');
    expect(area.name).toBe('Health');
    expect(area.description).toBe('Physical wellness');
    expect(area.id).toHaveLength(8);
  });

  it('lists areas ordered by position', () => {
    service.add('Health');
    service.add('Career');
    service.add('Finance');

    const areas = service.list();
    expect(areas).toHaveLength(3);
    expect(areas[0].name).toBe('Health');
    expect(areas[0].position).toBe(0);
    expect(areas[2].name).toBe('Finance');
    expect(areas[2].position).toBe(2);
  });

  it('edits an area', () => {
    const area = service.add('Helth');
    const updated = service.edit(area.id, { name: 'Health' });
    expect(updated.name).toBe('Health');
  });

  it('removes an area', () => {
    const area = service.add('Health');
    service.remove(area.id);
    expect(service.list()).toHaveLength(0);
  });

  it('throws NotFoundError for missing area', () => {
    expect(() => service.show('nonexist')).toThrow('not found');
  });

  it('validates name length', () => {
    expect(() => service.add('')).toThrow('1-100 characters');
    expect(() => service.add('x'.repeat(101))).toThrow('1-100 characters');
  });

  it('shows area detail with stats', () => {
    const area = service.add('Health');
    const detail = service.show(area.id);
    expect(detail.name).toBe('Health');
    expect(detail.goals).toEqual([]);
    expect(detail.tasks).toEqual([]);
    expect(detail.habits).toEqual([]);
  });

  it('includes stats in list', () => {
    const areas = service.list();
    if (areas.length > 0) {
      expect(areas[0]).toHaveProperty('goalCount');
      expect(areas[0]).toHaveProperty('taskCount');
      expect(areas[0]).toHaveProperty('habitCount');
    }
  });
});
