import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from './helpers/db.js';
import { AreaRepository } from '../../src/repositories/area.repository.js';
import { GoalRepository } from '../../src/repositories/goal.repository.js';
import { MilestoneRepository } from '../../src/repositories/milestone.repository.js';
import { TaskRepository } from '../../src/repositories/task.repository.js';
import { HabitRepository } from '../../src/repositories/habit.repository.js';
import { AreaService } from '../../src/services/area.service.js';
import { GoalService } from '../../src/services/goal.service.js';
import type { DB } from '../../src/db/connection.js';

let db: DB;
let areaService: AreaService;
let goalService: GoalService;

beforeEach(() => {
  db = createTestDb();
  const areaRepo = new AreaRepository(db);
  const goalRepo = new GoalRepository(db);
  const milestoneRepo = new MilestoneRepository(db);
  const taskRepo = new TaskRepository(db);
  const habitRepo = new HabitRepository(db);
  areaService = new AreaService(areaRepo, goalRepo, taskRepo, habitRepo);
  goalService = new GoalService(goalRepo, milestoneRepo, areaRepo, taskRepo, habitRepo);
});

describe('GoalService', () => {
  it('creates a goal', () => {
    const goal = goalService.add('Run a marathon', { priority: 'high' });
    expect(goal.title).toBe('Run a marathon');
    expect(goal.priority).toBe('high');
    expect(goal.status).toBe('active');
    expect(goal.progress).toBe(0);
  });

  it('creates a goal linked to an area', () => {
    const area = areaService.add('Health');
    const goal = goalService.add('Run a marathon', { areaId: area.id });
    expect(goal.areaId).toBe(area.id);
  });

  it('validates title length', () => {
    expect(() => goalService.add('')).toThrow('1-200 characters');
    expect(() => goalService.add('x'.repeat(201))).toThrow('1-200 characters');
  });

  it('validates area exists when linking', () => {
    expect(() => goalService.add('Goal', { areaId: 'fake123' })).toThrow('not found');
  });

  it('filters by area and status', () => {
    const area = areaService.add('Health');
    goalService.add('Goal 1', { areaId: area.id });
    goalService.add('Goal 2');

    const filtered = goalService.list({ areaId: area.id });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Goal 1');
  });

  it('sets progress manually', () => {
    const goal = goalService.add('Goal');
    const updated = goalService.setProgress(goal.id, 75);
    expect(updated.progress).toBe(75);
  });

  it('validates progress range', () => {
    const goal = goalService.add('Goal');
    expect(() => goalService.setProgress(goal.id, -1)).toThrow('0-100');
    expect(() => goalService.setProgress(goal.id, 101)).toThrow('0-100');
  });

  it('marks done sets progress to 100', () => {
    const goal = goalService.add('Goal');
    const done = goalService.markDone(goal.id);
    expect(done.status).toBe('done');
    expect(done.progress).toBe(100);
  });

  it('archives a goal', () => {
    const goal = goalService.add('Goal');
    const archived = goalService.archive(goal.id);
    expect(archived.status).toBe('archived');
  });

  it('shows goal detail', () => {
    const area = areaService.add('Health');
    const goal = goalService.add('Goal', { areaId: area.id });
    const detail = goalService.show(goal.id);
    expect(detail.area?.name).toBe('Health');
    expect(detail.milestones).toEqual([]);
    expect(detail.tasks).toEqual([]);
  });

  describe('milestones', () => {
    it('adds milestones and recalculates progress', () => {
      const goal = goalService.add('Goal');
      goalService.addMilestone(goal.id, 'Step 1');
      goalService.addMilestone(goal.id, 'Step 2');

      const detail = goalService.show(goal.id);
      expect(detail.milestones).toHaveLength(2);
      expect(detail.progress).toBe(0); // None done
    });

    it('toggling milestone recalculates progress', () => {
      const goal = goalService.add('Goal');
      const ms1 = goalService.addMilestone(goal.id, 'Step 1');
      goalService.addMilestone(goal.id, 'Step 2');

      goalService.toggleMilestone(ms1.id);
      const updated = goalService.show(goal.id);
      expect(updated.progress).toBe(50); // 1/2 = 50%
    });

    it('all milestones done = 100% progress', () => {
      const goal = goalService.add('Goal');
      const ms1 = goalService.addMilestone(goal.id, 'Step 1');
      const ms2 = goalService.addMilestone(goal.id, 'Step 2');

      goalService.toggleMilestone(ms1.id);
      goalService.toggleMilestone(ms2.id);
      const updated = goalService.show(goal.id);
      expect(updated.progress).toBe(100);
    });

    it('removing milestone recalculates progress', () => {
      const goal = goalService.add('Goal');
      const ms1 = goalService.addMilestone(goal.id, 'Step 1');
      const ms2 = goalService.addMilestone(goal.id, 'Step 2');

      goalService.toggleMilestone(ms1.id);
      goalService.removeMilestone(ms2.id);
      // 1/1 done = 100%
      const updated = goalService.show(goal.id);
      expect(updated.progress).toBe(100);
    });
  });
});
