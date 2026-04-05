import { eq, and, type SQL } from 'drizzle-orm';
import { goals, type Goal, type NewGoal } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class GoalRepository {
  constructor(private db: DB, private spaceId: string) {}

  findAll(filters?: { areaId?: string; status?: string }): Goal[] {
    const conditions: SQL[] = [eq(goals.spaceId, this.spaceId)];
    if (filters?.areaId) conditions.push(eq(goals.areaId, filters.areaId));
    if (filters?.status) conditions.push(eq(goals.status, filters.status as Goal['status']));

    return this.db.select().from(goals).where(and(...conditions)).all();
  }

  findById(id: string): Goal | undefined {
    return this.db.select().from(goals)
      .where(and(eq(goals.id, id), eq(goals.spaceId, this.spaceId)))
      .get();
  }

  findByAreaId(areaId: string): Goal[] {
    return this.db.select().from(goals)
      .where(and(eq(goals.areaId, areaId), eq(goals.spaceId, this.spaceId)))
      .all();
  }

  create(data: Omit<NewGoal, 'spaceId'>): Goal {
    this.db.insert(goals).values({ ...data, spaceId: this.spaceId }).run();
    return this.findById(data.id!)!;
  }

  update(id: string, data: Partial<Omit<NewGoal, 'id'>>): Goal | undefined {
    this.db.update(goals).set(data)
      .where(and(eq(goals.id, id), eq(goals.spaceId, this.spaceId)))
      .run();
    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.delete(goals)
      .where(and(eq(goals.id, id), eq(goals.spaceId, this.spaceId)))
      .run();
    return result.changes > 0;
  }
}
