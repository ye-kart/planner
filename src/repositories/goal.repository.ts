import { eq, and, type SQL } from 'drizzle-orm';
import { goals, type Goal, type NewGoal } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class GoalRepository {
  constructor(private db: DB) {}

  findAll(filters?: { areaId?: string; status?: string }): Goal[] {
    const conditions: SQL[] = [];
    if (filters?.areaId) conditions.push(eq(goals.areaId, filters.areaId));
    if (filters?.status) conditions.push(eq(goals.status, filters.status as Goal['status']));

    if (conditions.length === 0) {
      return this.db.select().from(goals).all();
    }
    return this.db.select().from(goals).where(and(...conditions)).all();
  }

  findById(id: string): Goal | undefined {
    return this.db.select().from(goals).where(eq(goals.id, id)).get();
  }

  findByAreaId(areaId: string): Goal[] {
    return this.db.select().from(goals).where(eq(goals.areaId, areaId)).all();
  }

  create(data: NewGoal): Goal {
    this.db.insert(goals).values(data).run();
    return this.findById(data.id!)!;
  }

  update(id: string, data: Partial<Omit<NewGoal, 'id'>>): Goal | undefined {
    this.db.update(goals).set(data).where(eq(goals.id, id)).run();
    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.delete(goals).where(eq(goals.id, id)).run();
    return result.changes > 0;
  }
}
