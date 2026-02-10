import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from './helpers/db.js';
import { AreaRepository } from '../../src/repositories/area.repository.js';
import { GoalRepository } from '../../src/repositories/goal.repository.js';
import { HabitRepository } from '../../src/repositories/habit.repository.js';
import { CompletionRepository } from '../../src/repositories/completion.repository.js';
import { HabitService } from '../../src/services/habit.service.js';
import type { DB } from '../../src/db/connection.js';

let db: DB;
let habitService: HabitService;

beforeEach(() => {
  db = createTestDb();
  const areaRepo = new AreaRepository(db);
  const goalRepo = new GoalRepository(db);
  const habitRepo = new HabitRepository(db);
  const completionRepo = new CompletionRepository(db);
  habitService = new HabitService(habitRepo, completionRepo, areaRepo, goalRepo);
});

describe('HabitService', () => {
  it('creates a daily habit', () => {
    const habit = habitService.add('Meditate');
    expect(habit.title).toBe('Meditate');
    expect(habit.frequency).toBe('daily');
    expect(habit.active).toBe(true);
    expect(habit.currentStreak).toBe(0);
  });

  it('creates a specific_days habit', () => {
    const habit = habitService.add('Run', { frequency: 'specific_days', days: [1, 3, 5] });
    expect(habit.frequency).toBe('specific_days');
    expect(habit.days).toBe('[1,3,5]');
  });

  it('validates specific_days requires days', () => {
    expect(() => habitService.add('Run', { frequency: 'specific_days' }))
      .toThrow('Days are required');
  });

  it('checks a habit (creates completion)', () => {
    const habit = habitService.add('Meditate');
    const completion = habitService.check(habit.id, '2026-02-10');
    expect(completion.date).toBe('2026-02-10');
    expect(completion.habitId).toBe(habit.id);
  });

  it('prevents double-checking same date', () => {
    const habit = habitService.add('Meditate');
    habitService.check(habit.id, '2026-02-10');
    expect(() => habitService.check(habit.id, '2026-02-10'))
      .toThrow('already checked');
  });

  it('unchecks a habit', () => {
    const habit = habitService.add('Meditate');
    habitService.check(habit.id, '2026-02-10');
    habitService.uncheck(habit.id, '2026-02-10');

    // Should be able to check again
    const completion = habitService.check(habit.id, '2026-02-10');
    expect(completion.date).toBe('2026-02-10');
  });

  it('uncheck throws if no completion', () => {
    const habit = habitService.add('Meditate');
    expect(() => habitService.uncheck(habit.id, '2026-02-10'))
      .toThrow('No completion found');
  });

  it('updates streaks on check', () => {
    const habit = habitService.add('Meditate');
    habitService.check(habit.id, '2026-02-08');
    habitService.check(habit.id, '2026-02-09');
    habitService.check(habit.id, '2026-02-10');

    const detail = habitService.show(habit.id);
    expect(detail.currentStreak).toBeGreaterThan(0);
  });

  it('archives and restores a habit', () => {
    const habit = habitService.add('Meditate');
    const archived = habitService.archive(habit.id);
    expect(archived.active).toBe(false);

    const restored = habitService.restore(habit.id);
    expect(restored.active).toBe(true);
  });

  it('archived habits not in active list', () => {
    const habit = habitService.add('Meditate');
    habitService.archive(habit.id);
    expect(habitService.list()).toHaveLength(0);
  });

  it('removes a habit', () => {
    const habit = habitService.add('Meditate');
    habitService.remove(habit.id);
    expect(() => habitService.show(habit.id)).toThrow('not found');
  });

  it('shows habit detail with recent completions', () => {
    const habit = habitService.add('Meditate');
    habitService.check(habit.id, '2026-02-10');
    const detail = habitService.show(habit.id);
    expect(detail.recentCompletions).toHaveLength(1);
    expect(detail.recentCompletions[0].date).toBe('2026-02-10');
  });

  it('gets streaks overview', () => {
    habitService.add('Meditate');
    habitService.add('Exercise');
    const streaks = habitService.streaks();
    expect(streaks).toHaveLength(2);
    expect(streaks[0]).toHaveProperty('currentStreak');
    expect(streaks[0]).toHaveProperty('bestStreak');
  });
});
