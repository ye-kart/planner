import { eq, and, type SQL } from 'drizzle-orm';
import { habits, type Habit, type NewHabit } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class HabitRepository {
  constructor(private db: DB, private spaceId: string) {}

  findAll(filters?: { areaId?: string; goalId?: string; active?: boolean }): Habit[] {
    const conditions: SQL[] = [eq(habits.spaceId, this.spaceId)];
    if (filters?.areaId) conditions.push(eq(habits.areaId, filters.areaId));
    if (filters?.goalId) conditions.push(eq(habits.goalId, filters.goalId));
    if (filters?.active !== undefined) conditions.push(eq(habits.active, filters.active));

    return this.db.select().from(habits).where(and(...conditions)).all();
  }

  findById(id: string): Habit | undefined {
    return this.db.select().from(habits)
      .where(and(eq(habits.id, id), eq(habits.spaceId, this.spaceId)))
      .get();
  }

  findByGoalId(goalId: string): Habit[] {
    return this.db.select().from(habits)
      .where(and(eq(habits.goalId, goalId), eq(habits.spaceId, this.spaceId)))
      .all();
  }

  findByAreaId(areaId: string): Habit[] {
    return this.db.select().from(habits)
      .where(and(eq(habits.areaId, areaId), eq(habits.spaceId, this.spaceId)))
      .all();
  }

  findActive(): Habit[] {
    return this.db.select().from(habits)
      .where(and(eq(habits.spaceId, this.spaceId), eq(habits.active, true)))
      .all();
  }

  create(data: Omit<NewHabit, 'spaceId'>): Habit {
    this.db.insert(habits).values({ ...data, spaceId: this.spaceId }).run();
    return this.findById(data.id!)!;
  }

  update(id: string, data: Partial<Omit<NewHabit, 'id'>>): Habit | undefined {
    this.db.update(habits).set(data)
      .where(and(eq(habits.id, id), eq(habits.spaceId, this.spaceId)))
      .run();
    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.delete(habits)
      .where(and(eq(habits.id, id), eq(habits.spaceId, this.spaceId)))
      .run();
    return result.changes > 0;
  }
}
