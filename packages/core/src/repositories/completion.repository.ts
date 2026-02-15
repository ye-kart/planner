import { eq, and, desc } from 'drizzle-orm';
import { completions, type Completion, type NewCompletion } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class CompletionRepository {
  constructor(private db: DB) {}

  findByHabitId(habitId: string): Completion[] {
    return this.db.select().from(completions)
      .where(eq(completions.habitId, habitId))
      .orderBy(desc(completions.date))
      .all();
  }

  findByHabitIdAndDate(habitId: string, date: string): Completion | undefined {
    return this.db.select().from(completions)
      .where(and(eq(completions.habitId, habitId), eq(completions.date, date)))
      .get();
  }

  findRecentByHabitId(habitId: string, limit: number): Completion[] {
    return this.db.select().from(completions)
      .where(eq(completions.habitId, habitId))
      .orderBy(desc(completions.date))
      .limit(limit)
      .all();
  }

  create(data: NewCompletion): Completion {
    this.db.insert(completions).values(data).run();
    return this.findByHabitIdAndDate(data.habitId, data.date)!;
  }

  delete(id: string): boolean {
    const result = this.db.delete(completions).where(eq(completions.id, id)).run();
    return result.changes > 0;
  }

  deleteByHabitIdAndDate(habitId: string, date: string): boolean {
    const result = this.db.delete(completions)
      .where(and(eq(completions.habitId, habitId), eq(completions.date, date)))
      .run();
    return result.changes > 0;
  }

  getCompletionDates(habitId: string): string[] {
    return this.db.select({ date: completions.date }).from(completions)
      .where(eq(completions.habitId, habitId))
      .orderBy(desc(completions.date))
      .all()
      .map(r => r.date);
  }
}
