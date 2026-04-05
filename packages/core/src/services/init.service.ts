import { mkdirSync, existsSync } from 'fs';
import { sql } from 'drizzle-orm';
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

    // Get the default space created by migration backfill
    const defaultSpace = this.db.all(sql`SELECT id FROM spaces ORDER BY position ASC LIMIT 1`);
    if (defaultSpace.length > 0) {
      const spaceId = (defaultSpace[0] as { id: string }).id;
      seedDefaultAreas(this.db, spaceId);
    }

    return { created: true, path: dir };
  }
}
