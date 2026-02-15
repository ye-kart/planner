import { mkdirSync, existsSync } from 'fs';
import { getPlannerDir } from '../utils/paths.js';
import { runMigrations } from '../db/migrate.js';
import { seedDefaultAreas } from '../db/seed.js';
import type { DB } from '../db/connection.js';

export class InitService {
  constructor(private db: DB) {}

  initialize(): { created: boolean; path: string } {
    const dir = getPlannerDir();

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    runMigrations(this.db);
    seedDefaultAreas(this.db);

    return { created: true, path: dir };
  }
}
