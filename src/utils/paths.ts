import { join } from 'path';
import { homedir } from 'os';

export function getPlannerDir(): string {
  return process.env.PLANNER_HOME ?? join(homedir(), '.planner');
}

export function getDbPath(): string {
  return join(getPlannerDir(), 'planner.db');
}
