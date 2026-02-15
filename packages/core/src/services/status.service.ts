import { TaskService, type TaskWithOverdue } from './task.service.js';
import { HabitService } from './habit.service.js';
import { today, formatDateHuman } from '../utils/date.js';
import type { Task, Habit } from '../db/schema.js';

export interface StatusData {
  date: string;
  dateFormatted: string;
  tasksDueToday: Task[];
  tasksOverdue: TaskWithOverdue[];
  habitsDueToday: Array<Habit & { done: boolean }>;
  summary: {
    tasksDue: number;
    tasksOverdue: number;
    habitsDue: number;
    habitsDone: number;
    bestActiveStreak: { habit: string; streak: number } | null;
  };
}

export class StatusService {
  constructor(
    private taskService: TaskService,
    private habitService: HabitService,
  ) {}

  getStatus(): StatusData {
    const td = today();
    const tasksDueToday = this.taskService.dueToday();
    const tasksOverdue = this.taskService.overdue();
    const habitsDueToday = this.habitService.getHabitsDueToday();

    const doneCount = habitsDueToday.filter(h => h.done).length;
    const allStreaks = this.habitService.streaks();
    const bestStreak = allStreaks.reduce(
      (best, h) => h.currentStreak > best.streak ? { habit: h.title, streak: h.currentStreak } : best,
      { habit: '', streak: 0 },
    );

    return {
      date: td,
      dateFormatted: formatDateHuman(td),
      tasksDueToday,
      tasksOverdue,
      habitsDueToday,
      summary: {
        tasksDue: tasksDueToday.length,
        tasksOverdue: tasksOverdue.length,
        habitsDue: habitsDueToday.length,
        habitsDone: doneCount,
        bestActiveStreak: bestStreak.streak > 0 ? bestStreak : null,
      },
    };
  }
}
