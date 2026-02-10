import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from './helpers/db.js';
import { AreaRepository } from '../../src/repositories/area.repository.js';
import { GoalRepository } from '../../src/repositories/goal.repository.js';
import { TaskRepository } from '../../src/repositories/task.repository.js';
import { MilestoneRepository } from '../../src/repositories/milestone.repository.js';
import { HabitRepository } from '../../src/repositories/habit.repository.js';
import { AreaService } from '../../src/services/area.service.js';
import { GoalService } from '../../src/services/goal.service.js';
import { TaskService } from '../../src/services/task.service.js';
import { today } from '../../src/utils/date.js';
import type { DB } from '../../src/db/connection.js';

let db: DB;
let areaService: AreaService;
let goalService: GoalService;
let taskService: TaskService;

beforeEach(() => {
  db = createTestDb();
  const areaRepo = new AreaRepository(db);
  const goalRepo = new GoalRepository(db);
  const milestoneRepo = new MilestoneRepository(db);
  const taskRepo = new TaskRepository(db);
  const habitRepo = new HabitRepository(db);
  areaService = new AreaService(areaRepo, goalRepo, taskRepo, habitRepo);
  goalService = new GoalService(goalRepo, milestoneRepo, areaRepo, taskRepo, habitRepo);
  taskService = new TaskService(taskRepo, areaRepo, goalRepo);
});

describe('TaskService', () => {
  it('creates a task', () => {
    const task = taskService.add('Buy groceries', { priority: 'high' });
    expect(task.title).toBe('Buy groceries');
    expect(task.priority).toBe('high');
    expect(task.status).toBe('todo');
  });

  it('creates a task linked to area and goal', () => {
    const area = areaService.add('Health');
    const goal = goalService.add('Eat healthy', { areaId: area.id });
    const task = taskService.add('Buy vegetables', { areaId: area.id, goalId: goal.id });
    expect(task.areaId).toBe(area.id);
    expect(task.goalId).toBe(goal.id);
  });

  it('validates title length', () => {
    expect(() => taskService.add('')).toThrow('1-200 characters');
  });

  it('validates references exist', () => {
    expect(() => taskService.add('Task', { areaId: 'fake' })).toThrow('not found');
    expect(() => taskService.add('Task', { goalId: 'fake' })).toThrow('not found');
  });

  it('marks done sets completedAt', () => {
    const task = taskService.add('Task');
    const done = taskService.markDone(task.id);
    expect(done.status).toBe('done');
    expect(done.completedAt).not.toBeNull();
  });

  it('moving away from done clears completedAt', () => {
    const task = taskService.add('Task');
    taskService.markDone(task.id);
    const reopened = taskService.edit(task.id, { status: 'todo' });
    expect(reopened.status).toBe('todo');
    expect(reopened.completedAt).toBeNull();
  });

  it('starts a task', () => {
    const task = taskService.add('Task');
    const started = taskService.start(task.id);
    expect(started.status).toBe('in_progress');
  });

  it('removes a task', () => {
    const task = taskService.add('Task');
    taskService.remove(task.id);
    expect(() => taskService.show(task.id)).toThrow('not found');
  });

  it('filters by status', () => {
    taskService.add('Task 1');
    const t2 = taskService.add('Task 2');
    taskService.markDone(t2.id);

    const todos = taskService.list({ status: 'todo' });
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Task 1');
  });

  it('finds tasks due today', () => {
    taskService.add('Today task', { dueDate: today() });
    taskService.add('Future task', { dueDate: '2099-01-01' });

    const due = taskService.dueToday();
    expect(due).toHaveLength(1);
    expect(due[0].title).toBe('Today task');
  });

  it('finds overdue tasks', () => {
    taskService.add('Old task', { dueDate: '2020-01-01' });
    taskService.add('Future task', { dueDate: '2099-01-01' });

    const overdue = taskService.overdue();
    expect(overdue).toHaveLength(1);
    expect(overdue[0].title).toBe('Old task');
    expect(overdue[0].daysOverdue).toBeGreaterThan(0);
  });
});
