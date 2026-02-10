import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDir, cleanupTestDir, runCli, runCliJson } from './helpers/cli.js';

let testDir: string;
beforeEach(() => {
  testDir = setupTestDir();
  runCli('init', testDir);
});
afterEach(() => cleanupTestDir(testDir));

describe('plan habits', () => {
  it('creates a habit', () => {
    const habit = runCliJson('habits add "Meditate"', testDir);
    expect(habit.title).toBe('Meditate');
    expect(habit.frequency).toBe('daily');
    expect(habit.active).toBe(true);
  });

  it('creates a specific_days habit', () => {
    const habit = runCliJson('habits add "Run" --frequency specific_days --days 1,3,5', testDir);
    expect(habit.frequency).toBe('specific_days');
    expect(habit.days).toBe('[1,3,5]');
  });

  it('checks and unchecks a habit', () => {
    const habit = runCliJson('habits add "Meditate"', testDir);
    const completion = runCliJson(`habits check ${habit.id} 2026-02-10`, testDir);
    expect(completion.date).toBe('2026-02-10');

    runCli(`habits uncheck ${habit.id} 2026-02-10`, testDir);
  });

  it('archives and restores a habit', () => {
    const habit = runCliJson('habits add "Meditate"', testDir);
    const archived = runCliJson(`habits archive ${habit.id}`, testDir);
    expect(archived.active).toBe(false);

    const restored = runCliJson(`habits restore ${habit.id}`, testDir);
    expect(restored.active).toBe(true);
  });

  it('shows habit detail', () => {
    const habit = runCliJson('habits add "Meditate"', testDir);
    runCli(`habits check ${habit.id} 2026-02-10`, testDir);

    const detail = runCliJson(`habits show ${habit.id}`, testDir);
    expect(detail.title).toBe('Meditate');
    expect(detail.recentCompletions).toHaveLength(1);
  });

  it('deletes a habit', () => {
    const habit = runCliJson('habits add "Meditate"', testDir);
    runCli(`habits rm ${habit.id}`, testDir);
    const habits = runCliJson('habits', testDir);
    expect(habits).toHaveLength(0);
  });

  it('shows streaks', () => {
    runCli('habits add "Meditate"', testDir);
    const { stdout } = runCli('habits streaks', testDir);
    expect(stdout).toContain('Meditate');
  });
});
