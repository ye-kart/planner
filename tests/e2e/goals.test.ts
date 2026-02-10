import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDir, cleanupTestDir, runCli, runCliJson } from './helpers/cli.js';

let testDir: string;
let areaId: string;

beforeEach(() => {
  testDir = setupTestDir();
  runCli('init', testDir);
  const areas = runCliJson('areas', testDir);
  areaId = areas[0].id;
});
afterEach(() => cleanupTestDir(testDir));

describe('plan goals', () => {
  it('creates a goal', () => {
    const goal = runCliJson(`goals add "Run a marathon" --area ${areaId} --priority high`, testDir);
    expect(goal.title).toBe('Run a marathon');
    expect(goal.areaId).toBe(areaId);
    expect(goal.priority).toBe('high');
  });

  it('lists goals', () => {
    runCli(`goals add "Goal 1" --area ${areaId}`, testDir);
    runCli('goals add "Goal 2"', testDir);
    const goals = runCliJson('goals', testDir);
    expect(goals).toHaveLength(2);
  });

  it('filters by area', () => {
    runCli(`goals add "Goal 1" --area ${areaId}`, testDir);
    runCli('goals add "Goal 2"', testDir);
    const goals = runCliJson(`goals --area ${areaId}`, testDir);
    expect(goals).toHaveLength(1);
    expect(goals[0].title).toBe('Goal 1');
  });

  it('shows goal detail', () => {
    const goal = runCliJson('goals add "My Goal"', testDir);
    const detail = runCliJson(`goals show ${goal.id}`, testDir);
    expect(detail.title).toBe('My Goal');
    expect(detail.milestones).toEqual([]);
  });

  it('sets progress', () => {
    const goal = runCliJson('goals add "My Goal"', testDir);
    const updated = runCliJson(`goals progress ${goal.id} 75`, testDir);
    expect(updated.progress).toBe(75);
  });

  it('marks goal done', () => {
    const goal = runCliJson('goals add "My Goal"', testDir);
    const done = runCliJson(`goals done ${goal.id}`, testDir);
    expect(done.status).toBe('done');
    expect(done.progress).toBe(100);
  });

  it('archives a goal', () => {
    const goal = runCliJson('goals add "My Goal"', testDir);
    const archived = runCliJson(`goals archive ${goal.id}`, testDir);
    expect(archived.status).toBe('archived');
  });

  it('deletes a goal', () => {
    const goal = runCliJson('goals add "My Goal"', testDir);
    runCli(`goals rm ${goal.id}`, testDir);
    const goals = runCliJson('goals', testDir);
    expect(goals).toHaveLength(0);
  });

  describe('milestones', () => {
    it('adds and toggles milestones', () => {
      const goal = runCliJson('goals add "My Goal"', testDir);
      const ms = runCliJson(`goals ms add ${goal.id} "Step 1"`, testDir);
      expect(ms.title).toBe('Step 1');
      expect(ms.done).toBe(false);

      const toggled = runCliJson(`goals ms toggle ${ms.id}`, testDir);
      expect(toggled.done).toBe(true);

      const detail = runCliJson(`goals show ${goal.id}`, testDir);
      expect(detail.progress).toBe(100);
    });

    it('removes a milestone', () => {
      const goal = runCliJson('goals add "My Goal"', testDir);
      const ms = runCliJson(`goals ms add ${goal.id} "Step 1"`, testDir);
      runCli(`goals ms rm ${ms.id}`, testDir);
      const detail = runCliJson(`goals show ${goal.id}`, testDir);
      expect(detail.milestones).toHaveLength(0);
    });
  });
});
