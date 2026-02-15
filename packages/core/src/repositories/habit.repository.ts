import { eq, and, type SQL } from 'drizzle-orm';
import { habits, type Habit, type NewHabit } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class HabitRepository {
  constructor(private db: DB) {}

  findAll(filters?: { areaId?: string; goalId?: string; active?: boolean }): Habit[] {
    const conditions: SQL[] = [];
    if (filters?.areaId) conditions.push(eq(habits.areaId, filters.areaId));
    if (filters?.goalId) conditions.push(eq(habits.goalId, filters.goalId));
    if (filters?.active !== undefined) conditions.push(eq(habits.active, filters.active));

    if (conditions.length === 0) {
      return this.db.select().from(habits).all();
    }
    return this.db.select().from(habits).where(and(...conditions)).all();
  }

  findById(id: string): Habit | undefined {
    return this.db.select().from(habits).where(eq(habits.id, id)).get();
  }

  findByGoalId(goalId: string): Habit[] {
    return this.db.select().from(habits).where(eq(habits.goalId, goalId)).all();
  }

  findByAreaId(areaId: string): Habit[] {
    return this.db.select().from(habits).where(eq(habits.areaId, areaId)).all();
  }

  findActive(): Habit[] {
    return this.db.select().from(habits).where(eq(habits.active, true)).all();
  }

  create(data: NewHabit): Habit {
    this.db.insert(habits).values(data).run();
    return this.findById(data.id!)!;
  }

  update(id: string, data: Partial<Omit<NewHabit, 'id'>>): Habit | undefined {
    this.db.update(habits).set(data).where(eq(habits.id, id)).run();
    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.delete(habits).where(eq(habits.id, id)).run();
    return result.changes > 0;
  }
}
