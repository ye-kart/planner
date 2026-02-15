import { AreaRepository } from '../repositories/area.repository.js';
import { GoalRepository } from '../repositories/goal.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { HabitRepository } from '../repositories/habit.repository.js';
import { generateId } from '../utils/id.js';
import { NotFoundError, ValidationError } from '../errors.js';
import type { Area } from '../db/schema.js';

export interface AreaWithStats extends Area {
  goalCount: number;
  taskCount: number;
  habitCount: number;
}

export interface AreaDetail extends Area {
  goals: import('../db/schema.js').Goal[];
  tasks: import('../db/schema.js').Task[];
  habits: import('../db/schema.js').Habit[];
}

export class AreaService {
  constructor(
    private areaRepo: AreaRepository,
    private goalRepo: GoalRepository,
    private taskRepo: TaskRepository,
    private habitRepo: HabitRepository,
  ) {}

  list(): AreaWithStats[] {
    const allAreas = this.areaRepo.findAll();
    return allAreas.map(area => ({
      ...area,
      goalCount: this.goalRepo.findByAreaId(area.id).length,
      taskCount: this.taskRepo.findByAreaId(area.id).length,
      habitCount: this.habitRepo.findByAreaId(area.id).length,
    }));
  }

  show(id: string): AreaDetail {
    const area = this.areaRepo.findById(id);
    if (!area) throw new NotFoundError('Area', id);
    return {
      ...area,
      goals: this.goalRepo.findByAreaId(id),
      tasks: this.taskRepo.findByAreaId(id),
      habits: this.habitRepo.findByAreaId(id),
    };
  }

  add(name: string, description?: string): Area {
    if (!name || name.length === 0 || name.length > 100) {
      throw new ValidationError('Area name must be 1-100 characters');
    }
    const position = this.areaRepo.getMaxPosition() + 1;
    return this.areaRepo.create({
      id: generateId(),
      name,
      description: description ?? null,
      position,
    });
  }

  edit(id: string, updates: { name?: string; description?: string }): Area {
    const area = this.areaRepo.findById(id);
    if (!area) throw new NotFoundError('Area', id);
    if (updates.name !== undefined && (updates.name.length === 0 || updates.name.length > 100)) {
      throw new ValidationError('Area name must be 1-100 characters');
    }
    return this.areaRepo.update(id, updates)!;
  }

  remove(id: string): void {
    const area = this.areaRepo.findById(id);
    if (!area) throw new NotFoundError('Area', id);
    this.areaRepo.delete(id);
  }
}
