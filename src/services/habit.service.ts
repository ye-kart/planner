import { HabitRepository } from '../repositories/habit.repository.js';
import { CompletionRepository } from '../repositories/completion.repository.js';
import { AreaRepository } from '../repositories/area.repository.js';
import { GoalRepository } from '../repositories/goal.repository.js';
import { generateId } from '../utils/id.js';
import { today, dayOfWeek } from '../utils/date.js';
import { calculateStreaks } from './streak.js';
import { NotFoundError, ValidationError } from '../errors.js';
import type { Habit, Completion } from '../db/schema.js';

export interface HabitDetail extends Habit {
  area: import('../db/schema.js').Area | null;
  goal: import('../db/schema.js').Goal | null;
  recentCompletions: Completion[];
}

export interface HabitStreakOverview {
  id: string;
  title: string;
  frequency: string;
  currentStreak: number;
  bestStreak: number;
  active: boolean;
}

export class HabitService {
  constructor(
    private habitRepo: HabitRepository,
    private completionRepo: CompletionRepository,
    private areaRepo: AreaRepository,
    private goalRepo: GoalRepository,
  ) {}

  list(filters?: { areaId?: string; goalId?: string }): Habit[] {
    return this.habitRepo.findAll({ ...filters, active: true });
  }

  show(id: string): HabitDetail {
    const habit = this.habitRepo.findById(id);
    if (!habit) throw new NotFoundError('Habit', id);
    return {
      ...habit,
      area: habit.areaId ? this.areaRepo.findById(habit.areaId) ?? null : null,
      goal: habit.goalId ? this.goalRepo.findById(habit.goalId) ?? null : null,
      recentCompletions: this.completionRepo.findRecentByHabitId(id, 30),
    };
  }

  add(title: string, options?: {
    frequency?: string;
    days?: number[];
    areaId?: string;
    goalId?: string;
  }): Habit {
    if (!title || title.length === 0 || title.length > 200) {
      throw new ValidationError('Habit title must be 1-200 characters');
    }
    const validFrequencies = ['daily', 'weekly', 'specific_days'];
    if (options?.frequency && !validFrequencies.includes(options.frequency)) {
      throw new ValidationError(`Frequency must be one of: ${validFrequencies.join(', ')}`);
    }
    if (options?.frequency === 'specific_days' && (!options?.days || options.days.length === 0)) {
      throw new ValidationError('Days are required for specific_days frequency');
    }
    if (options?.areaId) {
      if (!this.areaRepo.findById(options.areaId)) throw new NotFoundError('Area', options.areaId);
    }
    if (options?.goalId) {
      if (!this.goalRepo.findById(options.goalId)) throw new NotFoundError('Goal', options.goalId);
    }

    return this.habitRepo.create({
      id: generateId(),
      title,
      frequency: (options?.frequency as Habit['frequency']) ?? 'daily',
      days: options?.days ? JSON.stringify(options.days) : null,
      areaId: options?.areaId ?? null,
      goalId: options?.goalId ?? null,
    });
  }

  edit(id: string, updates: {
    title?: string;
    frequency?: string;
    days?: number[];
    areaId?: string | null;
    goalId?: string | null;
  }): Habit {
    const habit = this.habitRepo.findById(id);
    if (!habit) throw new NotFoundError('Habit', id);
    if (updates.title !== undefined && (updates.title.length === 0 || updates.title.length > 200)) {
      throw new ValidationError('Habit title must be 1-200 characters');
    }

    const updateData: any = { ...updates };
    if (updates.days) {
      updateData.days = JSON.stringify(updates.days);
    }
    delete updateData.days;
    if (updates.days) {
      updateData.days = JSON.stringify(updates.days);
    }

    return this.habitRepo.update(id, updateData)!;
  }

  check(id: string, date?: string): Completion {
    const habit = this.habitRepo.findById(id);
    if (!habit) throw new NotFoundError('Habit', id);

    const checkDate = date ?? today();
    const existing = this.completionRepo.findByHabitIdAndDate(id, checkDate);
    if (existing) {
      throw new ValidationError(`Habit already checked for ${checkDate}`);
    }

    const completion = this.completionRepo.create({
      id: generateId(),
      habitId: id,
      date: checkDate,
    });

    this.updateStreaks(id);
    return completion;
  }

  uncheck(id: string, date?: string): void {
    const habit = this.habitRepo.findById(id);
    if (!habit) throw new NotFoundError('Habit', id);

    const checkDate = date ?? today();
    const deleted = this.completionRepo.deleteByHabitIdAndDate(id, checkDate);
    if (!deleted) {
      throw new ValidationError(`No completion found for ${checkDate}`);
    }

    this.updateStreaks(id);
  }

  archive(id: string): Habit {
    const habit = this.habitRepo.findById(id);
    if (!habit) throw new NotFoundError('Habit', id);
    return this.habitRepo.update(id, { active: false })!;
  }

  restore(id: string): Habit {
    const habit = this.habitRepo.findById(id);
    if (!habit) throw new NotFoundError('Habit', id);
    return this.habitRepo.update(id, { active: true })!;
  }

  remove(id: string): void {
    const habit = this.habitRepo.findById(id);
    if (!habit) throw new NotFoundError('Habit', id);
    this.habitRepo.delete(id);
  }

  streaks(): HabitStreakOverview[] {
    const activeHabits = this.habitRepo.findActive();
    return activeHabits.map(habit => ({
      id: habit.id,
      title: habit.title,
      frequency: habit.frequency,
      currentStreak: habit.currentStreak,
      bestStreak: habit.bestStreak,
      active: habit.active,
    }));
  }

  isDueToday(habit: Habit): boolean {
    const dow = dayOfWeek(today());
    switch (habit.frequency) {
      case 'daily':
        return true;
      case 'weekly':
        return true; // Can be done any day of the week
      case 'specific_days':
        const days: number[] = habit.days ? JSON.parse(habit.days) : [];
        return days.includes(dow);
      default:
        return false;
    }
  }

  getHabitsDueToday(): Array<Habit & { done: boolean }> {
    const activeHabits = this.habitRepo.findActive();
    const td = today();
    return activeHabits
      .filter(h => this.isDueToday(h))
      .map(h => ({
        ...h,
        done: !!this.completionRepo.findByHabitIdAndDate(h.id, td),
      }));
  }

  private updateStreaks(habitId: string): void {
    const habit = this.habitRepo.findById(habitId)!;
    const dates = this.completionRepo.getCompletionDates(habitId);
    const days: number[] | null = habit.days ? JSON.parse(habit.days) : null;

    const { currentStreak, bestStreak } = calculateStreaks(dates, habit.frequency, days);

    const lastCompletedAt = dates.length > 0 ? dates[0] : null;
    this.habitRepo.update(habitId, {
      currentStreak,
      bestStreak: Math.max(bestStreak, habit.bestStreak),
      lastCompletedAt,
    });
  }
}
