import { eq, and, asc } from 'drizzle-orm';
import { areas, type Area, type NewArea } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class AreaRepository {
  constructor(private db: DB, private spaceId: string) {}

  findAll(): Area[] {
    return this.db.select().from(areas)
      .where(eq(areas.spaceId, this.spaceId))
      .orderBy(asc(areas.position))
      .all();
  }

  findById(id: string): Area | undefined {
    return this.db.select().from(areas)
      .where(and(eq(areas.id, id), eq(areas.spaceId, this.spaceId)))
      .get();
  }

  create(data: Omit<NewArea, 'spaceId'>): Area {
    this.db.insert(areas).values({ ...data, spaceId: this.spaceId }).run();
    return this.findById(data.id!)!;
  }

  update(id: string, data: Partial<Omit<NewArea, 'id'>>): Area | undefined {
    this.db.update(areas).set(data)
      .where(and(eq(areas.id, id), eq(areas.spaceId, this.spaceId)))
      .run();
    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.delete(areas)
      .where(and(eq(areas.id, id), eq(areas.spaceId, this.spaceId)))
      .run();
    return result.changes > 0;
  }

  count(): number {
    const result = this.db.select().from(areas)
      .where(eq(areas.spaceId, this.spaceId))
      .all();
    return result.length;
  }

  getMaxPosition(): number {
    const all = this.db.select().from(areas)
      .where(eq(areas.spaceId, this.spaceId))
      .orderBy(asc(areas.position))
      .all();
    if (all.length === 0) return -1;
    return all[all.length - 1].position;
  }
}
