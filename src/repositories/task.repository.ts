import { eq, and, lte, lt, type SQL } from 'drizzle-orm';
import { tasks, type Task, type NewTask } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class TaskRepository {
  constructor(private db: DB) {}

  findAll(filters?: { status?: string; priority?: string; areaId?: string; goalId?: string }): Task[] {
    const conditions: SQL[] = [];
    if (filters?.status) conditions.push(eq(tasks.status, filters.status as Task['status']));
    if (filters?.priority) conditions.push(eq(tasks.priority, filters.priority as Task['priority']));
    if (filters?.areaId) conditions.push(eq(tasks.areaId, filters.areaId));
    if (filters?.goalId) conditions.push(eq(tasks.goalId, filters.goalId));

    if (conditions.length === 0) {
      return this.db.select().from(tasks).all();
    }
    return this.db.select().from(tasks).where(and(...conditions)).all();
  }

  findById(id: string): Task | undefined {
    return this.db.select().from(tasks).where(eq(tasks.id, id)).get();
  }

  findByGoalId(goalId: string): Task[] {
    return this.db.select().from(tasks).where(eq(tasks.goalId, goalId)).all();
  }

  findByAreaId(areaId: string): Task[] {
    return this.db.select().from(tasks).where(eq(tasks.areaId, areaId)).all();
  }

  findDueBy(date: string): Task[] {
    return this.db.select().from(tasks)
      .where(and(lte(tasks.dueDate, date), eq(tasks.status, 'todo')))
      .all();
  }

  findOverdue(today: string): Task[] {
    return this.db.select().from(tasks)
      .where(and(lt(tasks.dueDate, today), eq(tasks.status, 'todo')))
      .all();
  }

  findDueOn(date: string): Task[] {
    return this.db.select().from(tasks)
      .where(and(eq(tasks.dueDate, date), eq(tasks.status, 'todo')))
      .all();
  }

  create(data: NewTask): Task {
    this.db.insert(tasks).values(data).run();
    return this.findById(data.id!)!;
  }

  update(id: string, data: Partial<Omit<NewTask, 'id'>>): Task | undefined {
    this.db.update(tasks).set(data).where(eq(tasks.id, id)).run();
    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.delete(tasks).where(eq(tasks.id, id)).run();
    return result.changes > 0;
  }
}
