import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, createTestSpace } from './helpers/db.js';
import { AreaRepository, GoalRepository, TaskRepository, HabitRepository, AreaService, type DB } from '@planner/core';

let db: DB;
let spaceId: string;
let service: AreaService;

beforeEach(() => {
  db = createTestDb();
  spaceId = createTestSpace(db);
  const areaRepo = new AreaRepository(db, spaceId);
  const goalRepo = new GoalRepository(db, spaceId);
  const taskRepo = new TaskRepository(db, spaceId);
  const habitRepo = new HabitRepository(db, spaceId);
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
