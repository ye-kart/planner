import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDir, cleanupTestDir, runCli, runCliJson } from './helpers/cli.js';

let testDir: string;
beforeEach(() => {
  testDir = setupTestDir();
  runCli('init', testDir);
});
afterEach(() => cleanupTestDir(testDir));

describe('plan areas', () => {
  it('lists all areas', () => {
    const { stdout } = runCli('areas', testDir);
    expect(stdout).toContain('Health');
    expect(stdout).toContain('Career');
  });

  it('lists areas as JSON', () => {
    const areas = runCliJson('areas', testDir);
    expect(Array.isArray(areas)).toBe(true);
    expect(areas.length).toBe(10);
  });

  it('adds a custom area', () => {
    const area = runCliJson('areas add "Side Projects"', testDir);
    expect(area.name).toBe('Side Projects');
    expect(area.id).toHaveLength(8);
  });

  it('adds area with description', () => {
    const area = runCliJson('areas add "Music" --desc "Playing guitar"', testDir);
    expect(area.name).toBe('Music');
    expect(area.description).toBe('Playing guitar');
  });

  it('edits an area', () => {
    const area = runCliJson('areas add "Helth"', testDir);
    const updated = runCliJson(`areas edit ${area.id} --name "Health 2"`, testDir);
    expect(updated.name).toBe('Health 2');
  });

  it('removes an area', () => {
    const area = runCliJson('areas add "Temp"', testDir);
    runCli(`areas rm ${area.id}`, testDir);
    const areas = runCliJson('areas', testDir);
    expect(areas.find((a: any) => a.id === area.id)).toBeUndefined();
  });

  it('shows area detail', () => {
    const areas = runCliJson('areas', testDir);
    const { stdout } = runCli(`areas show ${areas[0].id}`, testDir);
    expect(stdout).toContain(areas[0].name);
  });
});
