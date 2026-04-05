import { eq, asc, sql } from 'drizzle-orm';
import { spaces, type Space, type NewSpace } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class SpaceRepository {
  constructor(private db: DB) {}

  findAll(): Space[] {
    return this.db.select().from(spaces).orderBy(asc(spaces.position)).all();
  }

  findById(id: string): Space | undefined {
    return this.db.select().from(spaces).where(eq(spaces.id, id)).get();
  }

  findByName(name: string): Space | undefined {
    return this.db.select().from(spaces).where(eq(spaces.name, name)).get();
  }

  create(data: NewSpace): Space {
    this.db.insert(spaces).values(data).run();
    return this.findById(data.id!)!;
  }

  update(id: string, data: Partial<Omit<NewSpace, 'id'>>): Space | undefined {
    this.db.update(spaces).set(data).where(eq(spaces.id, id)).run();
    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.delete(spaces).where(eq(spaces.id, id)).run();
    return result.changes > 0;
  }

  count(): number {
    const result = this.db.select({ count: sql<number>`COUNT(*)` }).from(spaces).get();
    return result?.count ?? 0;
  }

  getMaxPosition(): number {
    const all = this.db.select().from(spaces).orderBy(asc(spaces.position)).all();
    if (all.length === 0) return -1;
    return all[all.length - 1].position;
  }
}
