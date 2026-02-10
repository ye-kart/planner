import { TaskRepository } from '../repositories/task.repository.js';
import { AreaRepository } from '../repositories/area.repository.js';
import { GoalRepository } from '../repositories/goal.repository.js';
import { generateId } from '../utils/id.js';
import { today, addDays, diffDays } from '../utils/date.js';
import { NotFoundError, ValidationError } from '../errors.js';
import type { Task } from '../db/schema.js';

export interface TaskWithOverdue extends Task {
  daysOverdue?: number;
}

export class TaskService {
  constructor(
    private taskRepo: TaskRepository,
    private areaRepo: AreaRepository,
    private goalRepo: GoalRepository,
  ) {}

  list(filters?: { status?: string; priority?: string; areaId?: string; goalId?: string }): Task[] {
    return this.taskRepo.findAll(filters);
  }

  show(id: string): Task {
    const task = this.taskRepo.findById(id);
    if (!task) throw new NotFoundError('Task', id);
    return task;
  }

  add(title: string, options?: { areaId?: string; goalId?: string; priority?: string; dueDate?: string; description?: string }): Task {
    if (!title || title.length === 0 || title.length > 200) {
      throw new ValidationError('Task title must be 1-200 characters');
    }
    if (options?.areaId) {
      if (!this.areaRepo.findById(options.areaId)) throw new NotFoundError('Area', options.areaId);
    }
    if (options?.goalId) {
      if (!this.goalRepo.findById(options.goalId)) throw new NotFoundError('Goal', options.goalId);
    }
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (options?.priority && !validPriorities.includes(options.priority)) {
      throw new ValidationError(`Priority must be one of: ${validPriorities.join(', ')}`);
    }
    return this.taskRepo.create({
      id: generateId(),
      title,
      description: options?.description ?? null,
      areaId: options?.areaId ?? null,
      goalId: options?.goalId ?? null,
      priority: (options?.priority as Task['priority']) ?? 'medium',
      dueDate: options?.dueDate ?? null,
    });
  }

  edit(id: string, updates: {
    title?: string;
    status?: string;
    priority?: string;
    dueDate?: string | null;
    areaId?: string | null;
    goalId?: string | null;
    description?: string | null;
  }): Task {
    const task = this.taskRepo.findById(id);
    if (!task) throw new NotFoundError('Task', id);
    if (updates.title !== undefined && (updates.title.length === 0 || updates.title.length > 200)) {
      throw new ValidationError('Task title must be 1-200 characters');
    }
    const validStatuses = ['todo', 'in_progress', 'done'];
    if (updates.status && !validStatuses.includes(updates.status)) {
      throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
    }
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (updates.priority && !validPriorities.includes(updates.priority)) {
      throw new ValidationError(`Priority must be one of: ${validPriorities.join(', ')}`);
    }

    // completedAt auto-management
    const updateData: any = { ...updates };
    if (updates.status === 'done' && task.status !== 'done') {
      updateData.completedAt = new Date().toISOString();
    } else if (updates.status && updates.status !== 'done' && task.status === 'done') {
      updateData.completedAt = null;
    }

    return this.taskRepo.update(id, updateData)!;
  }

  markDone(id: string): Task {
    return this.edit(id, { status: 'done' });
  }

  start(id: string): Task {
    return this.edit(id, { status: 'in_progress' });
  }

  remove(id: string): void {
    const task = this.taskRepo.findById(id);
    if (!task) throw new NotFoundError('Task', id);
    this.taskRepo.delete(id);
  }

  upcoming(days: number = 7): Task[] {
    const endDate = addDays(today(), days);
    return this.taskRepo.findDueBy(endDate);
  }

  dueToday(): Task[] {
    return this.taskRepo.findDueOn(today());
  }

  overdue(): TaskWithOverdue[] {
    const now = today();
    return this.taskRepo.findOverdue(now).map(task => ({
      ...task,
      daysOverdue: task.dueDate ? diffDays(now, task.dueDate) : 0,
    }));
  }
}
