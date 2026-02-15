import { eq, asc } from 'drizzle-orm';
import { milestones, type Milestone, type NewMilestone } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class MilestoneRepository {
  constructor(private db: DB) {}

  findByGoalId(goalId: string): Milestone[] {
    return this.db.select().from(milestones)
      .where(eq(milestones.goalId, goalId))
      .orderBy(asc(milestones.position))
      .all();
  }

  findById(id: string): Milestone | undefined {
    return this.db.select().from(milestones).where(eq(milestones.id, id)).get();
  }

  create(data: NewMilestone): Milestone {
    this.db.insert(milestones).values(data).run();
    return this.findById(data.id!)!;
  }

  update(id: string, data: Partial<Omit<NewMilestone, 'id'>>): Milestone | undefined {
    this.db.update(milestones).set(data).where(eq(milestones.id, id)).run();
    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.delete(milestones).where(eq(milestones.id, id)).run();
    return result.changes > 0;
  }

  getMaxPosition(goalId: string): number {
    const all = this.findByGoalId(goalId);
    if (all.length === 0) return -1;
    return all[all.length - 1].position;
  }
}
