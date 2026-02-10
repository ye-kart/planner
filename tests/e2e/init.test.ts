import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDir, cleanupTestDir, runCli, runCliJson } from './helpers/cli.js';

let testDir: string;
beforeEach(() => { testDir = setupTestDir(); });
afterEach(() => cleanupTestDir(testDir));

describe('plan init', () => {
  it('initializes the planner', () => {
    const { stdout, exitCode } = runCli('init', testDir);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('initialized');
  });

  it('seeds default areas', () => {
    runCli('init', testDir);
    const areas = runCliJson('areas', testDir);
    expect(areas).toHaveLength(10);
    expect(areas[0].name).toBe('Health');
    expect(areas[9].name).toBe('Community');
  });

  it('is idempotent', () => {
    runCli('init', testDir);
    const { exitCode } = runCli('init', testDir);
    expect(exitCode).toBe(0);

    const areas = runCliJson('areas', testDir);
    expect(areas).toHaveLength(10);
  });
});
