import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { setupTestDir, cleanupTestDir, runCli, runCliJson } from './helpers/cli.js';

let testDir: string;

beforeEach(() => {
  testDir = setupTestDir();
  runCli('init', testDir);
});
afterEach(() => cleanupTestDir(testDir));

describe('plan export', () => {
  it('exports markdown to specified path', () => {
    const outputPath = join(testDir, 'export.md');
    const { exitCode } = runCli(`export --output ${outputPath}`, testDir);

    expect(exitCode).toBe(0);
    expect(existsSync(outputPath)).toBe(true);

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toContain('# Planner Export');
    expect(content).toContain('> Exported on');
  });

  it('exports all seeded areas', () => {
    const outputPath = join(testDir, 'export.md');
    runCli(`export --output ${outputPath}`, testDir);

    const content = readFileSync(outputPath, 'utf-8');
    // Default seeded areas should appear
    expect(content).toContain('## Health');
  });

  it('includes added goals, tasks, and habits', () => {
    const areas = runCliJson('areas', testDir);
    const areaId = areas[0].id;

    const goal = runCliJson(`goals add "Learn Spanish" --area ${areaId} --priority high`, testDir);
    runCli(`goals ms add ${goal.id} "Complete A1 level"`, testDir);
    runCli(`tasks add "Buy textbook" --goal ${goal.id} --area ${areaId} --due 2026-06-01`, testDir);
    runCli(`habits add "Study 30 min" --goal ${goal.id} --area ${areaId}`, testDir);

    const outputPath = join(testDir, 'export.md');
    runCli(`export --output ${outputPath}`, testDir);

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toContain('#### Learn Spanish');
    expect(content).toContain('Complete A1 level');
    expect(content).toContain('Buy textbook');
    expect(content).toContain('Study 30 min');
    expect(content).toContain('2026-06-01');
  });

  it('exports JSON when --json flag is used', () => {
    const outputPath = join(testDir, 'export.json');
    runCli(`export --output ${outputPath} --json`, testDir);

    const content = readFileSync(outputPath, 'utf-8');
    const data = JSON.parse(content);
    expect(data).toHaveProperty('areas');
    expect(data).toHaveProperty('unlinked');
  });

  it('prints confirmation with output path', () => {
    const outputPath = join(testDir, 'export.md');
    const { stdout } = runCli(`export --output ${outputPath}`, testDir);

    expect(stdout).toContain('Exported to');
    expect(stdout).toContain(outputPath);
  });

  it('fails when --output is missing', () => {
    const { exitCode, stderr } = runCli('export', testDir);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('--output');
  });

  it('includes unlinked tasks in the export', () => {
    runCli('tasks add "Standalone task"', testDir);

    const outputPath = join(testDir, 'export.md');
    runCli(`export --output ${outputPath}`, testDir);

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toContain('Standalone task');
    expect(content).toContain('## Unlinked');
  });
});
