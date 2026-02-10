import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDir, cleanupTestDir, runCli, runCliJson, runCliParseJson } from './helpers/cli.js';

let testDir: string;
let areaId: string;
let goalId: string;

beforeEach(() => {
  testDir = setupTestDir();
  runCli('init', testDir);
  const areas = runCliJson('areas', testDir);
  areaId = areas[0].id;
  const goal = runCliJson(`goals add "Test Goal" --area ${areaId}`, testDir);
  goalId = goal.id;
});
afterEach(() => cleanupTestDir(testDir));

describe('plan context', () => {
  it('returns goal context', () => {
    runCli(`goals ms add ${goalId} "Step 1"`, testDir);
    runCli(`tasks add "Task 1" --goal ${goalId} --area ${areaId}`, testDir);

    const ctx = runCliParseJson(`context goal ${goalId}`, testDir);
    expect(ctx.goal.title).toBe('Test Goal');
    expect(ctx.goal.area.name).toBe('Health');
    expect(ctx.goal.milestones).toHaveLength(1);
    expect(ctx.goal.tasks).toHaveLength(1);
  });

  it('returns area context', () => {
    const ctx = runCliParseJson(`context area ${areaId}`, testDir);
    expect(ctx.area.name).toBe('Health');
    expect(ctx.area.goals).toHaveLength(1);
  });

  it('returns task context', () => {
    const task = runCliJson(`tasks add "Buy shoes" --goal ${goalId} --area ${areaId}`, testDir);
    const ctx = runCliParseJson(`context task ${task.id}`, testDir);
    expect(ctx.task.title).toBe('Buy shoes');
    expect(ctx.task.goal.title).toBe('Test Goal');
  });

  it('returns today context', () => {
    const ctx = runCliParseJson('context today', testDir);
    expect(ctx).toHaveProperty('date');
    expect(ctx).toHaveProperty('summary');
  });

  it('returns full context', () => {
    const ctx = runCliParseJson('context all', testDir);
    expect(ctx.areas).toHaveLength(10);
    expect(ctx).toHaveProperty('unlinked');
  });
});
