import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

export function setupTestDir(): string {
  const dir = join(tmpdir(), `planner-e2e-${randomBytes(8).toString('hex')}`);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function cleanupTestDir(dir: string): void {
  if (dir && existsSync(dir)) {
    rmSync(dir, { recursive: true });
  }
}

export function runCli(args: string, plannerHome: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(
      `npx tsx ${join(process.cwd(), 'src/index.ts')} ${args}`,
      {
        env: { ...process.env, PLANNER_HOME: plannerHome },
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 15000,
      },
    );
    return { stdout: stdout.trim(), stderr: '', exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: (err.stdout ?? '').toString().trim(),
      stderr: (err.stderr ?? '').toString().trim(),
      exitCode: err.status ?? 1,
    };
  }
}

export function runCliJson<T = any>(args: string, plannerHome: string): T {
  const { stdout } = runCli(args + ' --json', plannerHome);
  return JSON.parse(stdout);
}

export function runCliParseJson<T = any>(args: string, plannerHome: string): T {
  const { stdout } = runCli(args, plannerHome);
  return JSON.parse(stdout);
}
