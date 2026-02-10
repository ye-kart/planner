import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from './helpers/db.js';
import { AreaRepository } from '../../src/repositories/area.repository.js';
import { GoalRepository } from '../../src/repositories/goal.repository.js';
import { MilestoneRepository } from '../../src/repositories/milestone.repository.js';
import { TaskRepository } from '../../src/repositories/task.repository.js';
import { HabitRepository } from '../../src/repositories/habit.repository.js';
import { CompletionRepository } from '../../src/repositories/completion.repository.js';
import { AreaService } from '../../src/services/area.service.js';
import { GoalService } from '../../src/services/goal.service.js';
import { TaskService } from '../../src/services/task.service.js';
import { HabitService } from '../../src/services/habit.service.js';
import { ContextService } from '../../src/services/context.service.js';
import type { DB } from '../../src/db/connection.js';

let db: DB;
let areaService: AreaService;
let goalService: GoalService;
let taskService: TaskService;
let habitService: HabitService;
let contextService: ContextService;

beforeEach(() => {
  db = createTestDb();
  const areaRepo = new AreaRepository(db);
  const goalRepo = new GoalRepository(db);
  const milestoneRepo = new MilestoneRepository(db);
  const taskRepo = new TaskRepository(db);
  const habitRepo = new HabitRepository(db);
  const completionRepo = new CompletionRepository(db);
  areaService = new AreaService(areaRepo, goalRepo, taskRepo, habitRepo);
  goalService = new GoalService(goalRepo, milestoneRepo, areaRepo, taskRepo, habitRepo);
  taskService = new TaskService(taskRepo, areaRepo, goalRepo);
  habitService = new HabitService(habitRepo, completionRepo, areaRepo, goalRepo);
  contextService = new ContextService(areaRepo, goalRepo, milestoneRepo, taskRepo, habitRepo, completionRepo);
});

describe('ContextService', () => {
  it('returns full goal context', () => {
    const area = areaService.add('Health');
    const goal = goalService.add('Run marathon', { areaId: area.id });
    goalService.addMilestone(goal.id, 'Run 10K');
    taskService.add('Buy shoes', { goalId: goal.id, areaId: area.id });
    habitService.add('Morning run', { goalId: goal.id, areaId: area.id });

    const ctx: any = contextService.goal(goal.id);
    expect(ctx.goal.title).toBe('Run marathon');
    expect(ctx.goal.area.name).toBe('Health');
    expect(ctx.goal.milestones).toHaveLength(1);
    expect(ctx.goal.tasks).toHaveLength(1);
    expect(ctx.goal.habits).toHaveLength(1);
  });

  it('returns full area context', () => {
    const area = areaService.add('Health');
    const goal = goalService.add('Run marathon', { areaId: area.id });
    taskService.add('Standalone task', { areaId: area.id });

    const ctx: any = contextService.area(area.id);
    expect(ctx.area.name).toBe('Health');
    expect(ctx.area.goals).toHaveLength(1);
    expect(ctx.area.tasks).toHaveLength(1);
  });

  it('returns task context with linked goal', () => {
    const area = areaService.add('Health');
    const goal = goalService.add('Run marathon', { areaId: area.id });
    const task = taskService.add('Buy shoes', { goalId: goal.id, areaId: area.id });

    const ctx: any = contextService.task(task.id);
    expect(ctx.task.title).toBe('Buy shoes');
    expect(ctx.task.area.name).toBe('Health');
    expect(ctx.task.goal.title).toBe('Run marathon');
  });

  it('returns habit context with completions', () => {
    const habit = habitService.add('Meditate');
    habitService.check(habit.id, '2026-02-10');

    const ctx: any = contextService.habit(habit.id);
    expect(ctx.habit.title).toBe('Meditate');
    expect(ctx.habit.recentCompletions).toHaveLength(1);
  });

  it('returns today context', () => {
    taskService.add('Due task', { dueDate: '2026-02-10' });
    taskService.add('Overdue task', { dueDate: '2026-02-09' });
    habitService.add('Daily habit');

    const ctx: any = contextService.today('2026-02-10');
    expect(ctx.date).toBe('2026-02-10');
    expect(ctx.tasksDueToday).toHaveLength(1);
    expect(ctx.tasksOverdue).toHaveLength(1);
    expect(ctx.habitsDueToday.length).toBeGreaterThan(0);
    expect(ctx.summary).toHaveProperty('tasksDue');
  });

  it('returns full context with all areas', () => {
    const area = areaService.add('Health');
    goalService.add('Goal', { areaId: area.id });
    taskService.add('Unlinked task');

    const ctx: any = contextService.all();
    expect(ctx.areas.length).toBeGreaterThan(0);
    expect(ctx.unlinked).toHaveProperty('tasks');
    expect(ctx.unlinked.tasks).toHaveLength(1);
  });
});
