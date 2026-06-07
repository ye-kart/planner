import { eq, ne, and, lte, lt, type SQL } from 'drizzle-orm';
import { tasks, type Task, type NewTask } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class TaskRepository {
  constructor(private db: DB, private spaceId: string) {}

  findAll(filters?: { status?: string; priority?: string; areaId?: string; goalId?: string }): Task[] {
    const conditions: SQL[] = [eq(tasks.spaceId, this.spaceId)];
    if (filters?.status) conditions.push(eq(tasks.status, filters.status as Task['status']));
    if (filters?.priority) conditions.push(eq(tasks.priority, filters.priority as Task['priority']));
    if (filters?.areaId) conditions.push(eq(tasks.areaId, filters.areaId));
    if (filters?.goalId) conditions.push(eq(tasks.goalId, filters.goalId));

    return this.db.select().from(tasks).where(and(...conditions)).all();
  }

  findById(id: string): Task | undefined {
    return this.db.select().from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.spaceId, this.spaceId)))
      .get();
  }

  findByGoalId(goalId: string): Task[] {
    return this.db.select().from(tasks)
      .where(and(eq(tasks.goalId, goalId), eq(tasks.spaceId, this.spaceId)))
      .all();
  }

  findByAreaId(areaId: string): Task[] {
    return this.db.select().from(tasks)
      .where(and(eq(tasks.areaId, areaId), eq(tasks.spaceId, this.spaceId)))
      .all();
  }

  findDueBy(date: string): Task[] {
    // Anything not done counts as outstanding (todo or in_progress).
    return this.db.select().from(tasks)
      .where(and(eq(tasks.spaceId, this.spaceId), lte(tasks.dueDate, date), ne(tasks.status, 'done')))
      .all();
  }

  findOverdue(today: string): Task[] {
    return this.db.select().from(tasks)
      .where(and(eq(tasks.spaceId, this.spaceId), lt(tasks.dueDate, today), ne(tasks.status, 'done')))
      .all();
  }

  findDueOn(date: string): Task[] {
    return this.db.select().from(tasks)
      .where(and(eq(tasks.spaceId, this.spaceId), eq(tasks.dueDate, date), ne(tasks.status, 'done')))
      .all();
  }

  create(data: Omit<NewTask, 'spaceId'>): Task {
    this.db.insert(tasks).values({ ...data, spaceId: this.spaceId }).run();
    return this.findById(data.id!)!;
  }

  update(id: string, data: Partial<Omit<NewTask, 'id'>>): Task | undefined {
    this.db.update(tasks).set(data)
      .where(and(eq(tasks.id, id), eq(tasks.spaceId, this.spaceId)))
      .run();
    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.spaceId, this.spaceId)))
      .run();
    return result.changes > 0;
  }
}
