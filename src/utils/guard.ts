import { existsSync } from 'fs';
import { getDbPath } from './paths.js';
import { NotInitializedError } from '../errors.js';

export function ensureInitialized(): void {
  if (!existsSync(getDbPath())) {
    throw new NotInitializedError();
  }
}
