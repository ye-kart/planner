import { AreaRepository } from '../repositories/area.repository.js';
import { GoalRepository } from '../repositories/goal.repository.js';
import { MilestoneRepository } from '../repositories/milestone.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { HabitRepository } from '../repositories/habit.repository.js';
import { CompletionRepository } from '../repositories/completion.repository.js';
import { NotFoundError } from '../errors.js';

export class ContextService {
  constructor(
    private areaRepo: AreaRepository,
    private goalRepo: GoalRepository,
    private milestoneRepo: MilestoneRepository,
    private taskRepo: TaskRepository,
    private habitRepo: HabitRepository,
    private completionRepo: CompletionRepository,
  ) {}

  goal(id: string): object {
    const goal = this.goalRepo.findById(id);
    if (!goal) throw new NotFoundError('Goal', id);
    const area = goal.areaId ? this.areaRepo.findById(goal.areaId) ?? null : null;
    const milestones = this.milestoneRepo.findByGoalId(id);
    const tasks = this.taskRepo.findByGoalId(id);
    const habits = this.habitRepo.findByGoalId(id);

    return {
      goal: {
        ...goal,
        area: area ? { id: area.id, name: area.name } : null,
        milestones: milestones.map(m => ({ id: m.id, title: m.title, done: m.done })),
        tasks: tasks.map(t => ({
          id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate,
        })),
        habits: habits.map(h => ({
          id: h.id, title: h.title, frequency: h.frequency,
          days: h.days ? JSON.parse(h.days) : null,
          currentStreak: h.currentStreak, bestStreak: h.bestStreak, active: h.active,
        })),
      },
    };
  }

  area(id: string): object {
    const area = this.areaRepo.findById(id);
    if (!area) throw new NotFoundError('Area', id);
    const goals = this.goalRepo.findByAreaId(id);
    const tasks = this.taskRepo.findByAreaId(id);
    const habits = this.habitRepo.findByAreaId(id);

    return {
      area: {
        ...area,
        goals: goals.map(g => ({
          ...g,
          milestones: this.milestoneRepo.findByGoalId(g.id).map(m => ({
            id: m.id, title: m.title, done: m.done,
          })),
          tasks: this.taskRepo.findByGoalId(g.id).map(t => ({
            id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate,
          })),
          habits: this.habitRepo.findByGoalId(g.id).map(h => ({
            id: h.id, title: h.title, frequency: h.frequency,
            days: h.days ? JSON.parse(h.days) : null,
            currentStreak: h.currentStreak, bestStreak: h.bestStreak, active: h.active,
          })),
        })),
        tasks: tasks.map(t => ({
          id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate,
        })),
        habits: habits.map(h => ({
          id: h.id, title: h.title, frequency: h.frequency,
          days: h.days ? JSON.parse(h.days) : null,
          currentStreak: h.currentStreak, bestStreak: h.bestStreak, active: h.active,
        })),
      },
    };
  }

  task(id: string): object {
    const task = this.taskRepo.findById(id);
    if (!task) throw new NotFoundError('Task', id);
    const area = task.areaId ? this.areaRepo.findById(task.areaId) ?? null : null;
    const goal = task.goalId ? this.goalRepo.findById(task.goalId) ?? null : null;

    return {
      task: {
        ...task,
        area: area ? { id: area.id, name: area.name } : null,
        goal: goal ? { id: goal.id, title: goal.title, progress: goal.progress } : null,
      },
    };
  }

  habit(id: string): object {
    const habit = this.habitRepo.findById(id);
    if (!habit) throw new NotFoundError('Habit', id);
    const area = habit.areaId ? this.areaRepo.findById(habit.areaId) ?? null : null;
    const goal = habit.goalId ? this.goalRepo.findById(habit.goalId) ?? null : null;
    const recentCompletions = this.completionRepo.findRecentByHabitId(id, 30);

    return {
      habit: {
        ...habit,
        days: habit.days ? JSON.parse(habit.days) : null,
        area: area ? { id: area.id, name: area.name } : null,
        goal: goal ? { id: goal.id, title: goal.title } : null,
        recentCompletions: recentCompletions.map(c => ({
          date: c.date, note: c.note,
        })),
      },
    };
  }

  today(todayDate: string): object {
    const allTasks = this.taskRepo.findAll({ status: 'todo' });
    const tasksDueToday = allTasks.filter(t => t.dueDate === todayDate);
    const tasksOverdue = allTasks.filter(t => t.dueDate && t.dueDate < todayDate);

    const activeHabits = this.habitRepo.findActive();
    const habitsDueToday = activeHabits.map(h => {
      const isDue = this.isHabitDueOn(h, todayDate);
      if (!isDue) return null;
      const done = !!this.completionRepo.findByHabitIdAndDate(h.id, todayDate);
      return { id: h.id, title: h.title, done, currentStreak: h.currentStreak };
    }).filter(Boolean);

    const doneCount = habitsDueToday.filter((h: any) => h.done).length;
    const bestActiveStreak = activeHabits.reduce(
      (best, h) => h.currentStreak > best.streak ? { habit: h.title, streak: h.currentStreak } : best,
      { habit: '', streak: 0 },
    );

    return {
      date: todayDate,
      tasksDueToday: tasksDueToday.map(t => {
        const goal = t.goalId ? this.goalRepo.findById(t.goalId) : null;
        return {
          id: t.id, title: t.title, priority: t.priority,
          goal: goal ? { id: goal.id, title: goal.title } : null,
        };
      }),
      tasksOverdue: tasksOverdue.map(t => ({
        id: t.id, title: t.title, dueDate: t.dueDate,
        daysOverdue: Math.round((new Date(todayDate).getTime() - new Date(t.dueDate!).getTime()) / 86400000),
      })),
      habitsDueToday,
      summary: {
        tasksDue: tasksDueToday.length,
        tasksOverdue: tasksOverdue.length,
        habitsDue: habitsDueToday.length,
        habitsDone: doneCount,
        bestActiveStreak: bestActiveStreak.streak > 0 ? bestActiveStreak : null,
      },
    };
  }

  all(): object {
    const allAreas = this.areaRepo.findAll();
    const allGoals = this.goalRepo.findAll();
    const allTasks = this.taskRepo.findAll();
    const allHabits = this.habitRepo.findAll();

    const buildGoal = (g: any) => ({
      ...g,
      milestones: this.milestoneRepo.findByGoalId(g.id).map((m: any) => ({
        id: m.id, title: m.title, done: m.done,
      })),
      tasks: allTasks.filter(t => t.goalId === g.id).map(t => ({
        id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate,
      })),
      habits: allHabits.filter(h => h.goalId === g.id).map(h => ({
        id: h.id, title: h.title, frequency: h.frequency,
        days: h.days ? JSON.parse(h.days) : null,
        currentStreak: h.currentStreak, bestStreak: h.bestStreak, active: h.active,
      })),
    });

    const areas = allAreas.map(area => ({
      ...area,
      goals: allGoals.filter(g => g.areaId === area.id).map(buildGoal),
      tasks: allTasks.filter(t => t.areaId === area.id && !t.goalId).map(t => ({
        id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate,
      })),
      habits: allHabits.filter(h => h.areaId === area.id && !h.goalId).map(h => ({
        id: h.id, title: h.title, frequency: h.frequency,
        days: h.days ? JSON.parse(h.days) : null,
        currentStreak: h.currentStreak, bestStreak: h.bestStreak, active: h.active,
      })),
    }));

    const unlinkedGoals = allGoals.filter(g => !g.areaId).map(buildGoal);
    const unlinkedTasks = allTasks.filter(t => !t.areaId).map(t => ({
      id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate,
    }));
    const unlinkedHabits = allHabits.filter(h => !h.areaId).map(h => ({
      id: h.id, title: h.title, frequency: h.frequency,
      days: h.days ? JSON.parse(h.days) : null,
      currentStreak: h.currentStreak, bestStreak: h.bestStreak, active: h.active,
    }));

    return {
      areas,
      unlinked: {
        goals: unlinkedGoals,
        tasks: unlinkedTasks,
        habits: unlinkedHabits,
      },
    };
  }

  private isHabitDueOn(habit: any, dateStr: string): boolean {
    switch (habit.frequency) {
      case 'daily':
        return true;
      case 'weekly':
        return true;
      case 'specific_days': {
        const days: number[] = habit.days ? JSON.parse(habit.days) : [];
        const date = new Date(dateStr + 'T00:00:00');
        return days.includes(date.getDay());
      }
      default:
        return false;
    }
  }
}
