import { execSync, spawn } from 'child_process';
import { join } from 'path';
import { setupTestDir, cleanupTestDir, runCli } from './helpers/cli.js';

describe('plan tui', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = setupTestDir();
    runCli('init', testDir);
  });

  afterEach(() => {
    cleanupTestDir(testDir);
  });

  it('registers the tui command in help output', () => {
    const { stdout } = runCli('--help', testDir);
    expect(stdout).toContain('tui');
  });

  it('shows tui command help', () => {
    const { stdout } = runCli('tui --help', testDir);
    expect(stdout).toContain('interactive terminal UI');
    expect(stdout).toContain('--theme');
  });
});
