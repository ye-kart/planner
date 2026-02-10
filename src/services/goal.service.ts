import { GoalRepository } from '../repositories/goal.repository.js';
import { MilestoneRepository } from '../repositories/milestone.repository.js';
import { AreaRepository } from '../repositories/area.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { HabitRepository } from '../repositories/habit.repository.js';
import { generateId } from '../utils/id.js';
import { NotFoundError, ValidationError } from '../errors.js';
import type { Goal, Milestone } from '../db/schema.js';

export interface GoalDetail extends Goal {
  area: import('../db/schema.js').Area | null;
  milestones: Milestone[];
  tasks: import('../db/schema.js').Task[];
  habits: import('../db/schema.js').Habit[];
}

export class GoalService {
  constructor(
    private goalRepo: GoalRepository,
    private milestoneRepo: MilestoneRepository,
    private areaRepo: AreaRepository,
    private taskRepo: TaskRepository,
    private habitRepo: HabitRepository,
  ) {}

  list(filters?: { areaId?: string; status?: string }): Goal[] {
    return this.goalRepo.findAll(filters);
  }

  show(id: string): GoalDetail {
    const goal = this.goalRepo.findById(id);
    if (!goal) throw new NotFoundError('Goal', id);
    return {
      ...goal,
      area: goal.areaId ? this.areaRepo.findById(goal.areaId) ?? null : null,
      milestones: this.milestoneRepo.findByGoalId(id),
      tasks: this.taskRepo.findByGoalId(id),
      habits: this.habitRepo.findByGoalId(id),
    };
  }

  add(title: string, options?: { areaId?: string; targetDate?: string; priority?: string; description?: string }): Goal {
    if (!title || title.length === 0 || title.length > 200) {
      throw new ValidationError('Goal title must be 1-200 characters');
    }
    if (options?.areaId) {
      const area = this.areaRepo.findById(options.areaId);
      if (!area) throw new NotFoundError('Area', options.areaId);
    }
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (options?.priority && !validPriorities.includes(options.priority)) {
      throw new ValidationError(`Priority must be one of: ${validPriorities.join(', ')}`);
    }
    return this.goalRepo.create({
      id: generateId(),
      title,
      description: options?.description ?? null,
      areaId: options?.areaId ?? null,
      targetDate: options?.targetDate ?? null,
      priority: (options?.priority as Goal['priority']) ?? 'medium',
    });
  }

  edit(id: string, updates: {
    title?: string;
    areaId?: string | null;
    status?: string;
    priority?: string;
    targetDate?: string | null;
    description?: string | null;
  }): Goal {
    const goal = this.goalRepo.findById(id);
    if (!goal) throw new NotFoundError('Goal', id);
    if (updates.title !== undefined && (updates.title.length === 0 || updates.title.length > 200)) {
      throw new ValidationError('Goal title must be 1-200 characters');
    }
    if (updates.areaId) {
      const area = this.areaRepo.findById(updates.areaId);
      if (!area) throw new NotFoundError('Area', updates.areaId);
    }
    const validStatuses = ['active', 'done', 'archived'];
    if (updates.status && !validStatuses.includes(updates.status)) {
      throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
    }
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (updates.priority && !validPriorities.includes(updates.priority)) {
      throw new ValidationError(`Priority must be one of: ${validPriorities.join(', ')}`);
    }
    return this.goalRepo.update(id, updates as any)!;
  }

  setProgress(id: string, progress: number): Goal {
    const goal = this.goalRepo.findById(id);
    if (!goal) throw new NotFoundError('Goal', id);
    if (progress < 0 || progress > 100) {
      throw new ValidationError('Progress must be 0-100');
    }
    return this.goalRepo.update(id, { progress })!;
  }

  markDone(id: string): Goal {
    const goal = this.goalRepo.findById(id);
    if (!goal) throw new NotFoundError('Goal', id);
    return this.goalRepo.update(id, { status: 'done', progress: 100 })!;
  }

  archive(id: string): Goal {
    const goal = this.goalRepo.findById(id);
    if (!goal) throw new NotFoundError('Goal', id);
    return this.goalRepo.update(id, { status: 'archived' })!;
  }

  remove(id: string): void {
    const goal = this.goalRepo.findById(id);
    if (!goal) throw new NotFoundError('Goal', id);
    this.goalRepo.delete(id);
  }

  // --- Milestone operations ---

  addMilestone(goalId: string, title: string): Milestone {
    const goal = this.goalRepo.findById(goalId);
    if (!goal) throw new NotFoundError('Goal', goalId);
    if (!title || title.length === 0 || title.length > 200) {
      throw new ValidationError('Milestone title must be 1-200 characters');
    }
    const position = this.milestoneRepo.getMaxPosition(goalId) + 1;
    const milestone = this.milestoneRepo.create({
      id: generateId(),
      goalId,
      title,
      position,
    });
    this.recalcProgress(goalId);
    return milestone;
  }

  toggleMilestone(msId: string): Milestone {
    const ms = this.milestoneRepo.findById(msId);
    if (!ms) throw new NotFoundError('Milestone', msId);
    const updated = this.milestoneRepo.update(msId, { done: !ms.done })!;
    this.recalcProgress(ms.goalId);
    return updated;
  }

  removeMilestone(msId: string): void {
    const ms = this.milestoneRepo.findById(msId);
    if (!ms) throw new NotFoundError('Milestone', msId);
    const goalId = ms.goalId;
    this.milestoneRepo.delete(msId);
    this.recalcProgress(goalId);
  }

  private recalcProgress(goalId: string): void {
    const milestones = this.milestoneRepo.findByGoalId(goalId);
    if (milestones.length === 0) return;
    const doneCount = milestones.filter(m => m.done).length;
    const progress = Math.round((doneCount / milestones.length) * 100);
    this.goalRepo.update(goalId, { progress });
  }
}
