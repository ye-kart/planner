import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDir, cleanupTestDir, runCli, runCliJson } from './helpers/cli.js';

let testDir: string;
beforeEach(() => {
  testDir = setupTestDir();
  runCli('init', testDir);
});
afterEach(() => cleanupTestDir(testDir));

describe('plan tasks', () => {
  it('creates a task', () => {
    const task = runCliJson('tasks add "Buy groceries" --priority high', testDir);
    expect(task.title).toBe('Buy groceries');
    expect(task.priority).toBe('high');
    expect(task.status).toBe('todo');
  });

  it('lists tasks', () => {
    runCli('tasks add "Task 1"', testDir);
    runCli('tasks add "Task 2"', testDir);
    const tasks = runCliJson('tasks', testDir);
    expect(tasks).toHaveLength(2);
  });

  it('shows task detail', () => {
    const task = runCliJson('tasks add "My Task" --due 2026-03-01', testDir);
    const detail = runCliJson(`tasks show ${task.id}`, testDir);
    expect(detail.title).toBe('My Task');
    expect(detail.dueDate).toBe('2026-03-01');
  });

  it('marks task done', () => {
    const task = runCliJson('tasks add "My Task"', testDir);
    const done = runCliJson(`tasks done ${task.id}`, testDir);
    expect(done.status).toBe('done');
    expect(done.completedAt).not.toBeNull();
  });

  it('starts a task', () => {
    const task = runCliJson('tasks add "My Task"', testDir);
    const started = runCliJson(`tasks start ${task.id}`, testDir);
    expect(started.status).toBe('in_progress');
  });

  it('deletes a task', () => {
    const task = runCliJson('tasks add "My Task"', testDir);
    runCli(`tasks rm ${task.id}`, testDir);
    const tasks = runCliJson('tasks', testDir);
    expect(tasks).toHaveLength(0);
  });

  it('filters by status', () => {
    const t1 = runCliJson('tasks add "Task 1"', testDir);
    runCli('tasks add "Task 2"', testDir);
    runCli(`tasks done ${t1.id}`, testDir);

    const todos = runCliJson('tasks --status todo', testDir);
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Task 2');
  });
});
