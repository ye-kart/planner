import { ContextService } from './context.service.js';
import { today, formatDateHuman } from '../utils/date.js';

interface ExportMilestone {
  id: string;
  title: string;
  done: boolean | number;
}

interface ExportTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

interface ExportHabit {
  id: string;
  title: string;
  frequency: string;
  days: number[] | null;
  currentStreak: number;
  bestStreak: number;
  active: boolean | number;
}

interface ExportGoal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  priority: string;
  targetDate: string | null;
  milestones: ExportMilestone[];
  tasks: ExportTask[];
  habits: ExportHabit[];
}

interface ExportArea {
  id: string;
  name: string;
  description: string | null;
  goals: ExportGoal[];
  tasks: ExportTask[];
  habits: ExportHabit[];
}

interface ExportData {
  areas: ExportArea[];
  unlinked: {
    goals: ExportGoal[];
    tasks: ExportTask[];
    habits: ExportHabit[];
  };
}

export class ExportService {
  constructor(private contextService: ContextService) {}

  generateMarkdown(): string {
    const data = this.contextService.all() as ExportData;
    const dateStr = today();
    const lines: string[] = [];

    lines.push('# Planner Export');
    lines.push('');
    lines.push(`> Exported on ${formatDateHuman(dateStr)}`);

    for (const area of data.areas) {
      lines.push('');
      lines.push('---');
      lines.push('');
      lines.push(`## ${area.name}`);
      if (area.description) {
        lines.push('');
        lines.push(`> ${area.description}`);
      }

      if (area.goals.length > 0) {
        lines.push('');
        lines.push('### Goals');
        for (const goal of area.goals) {
          this.renderGoal(lines, goal);
        }
      }

      if (area.tasks.length > 0) {
        lines.push('');
        lines.push('### Tasks');
        lines.push('');
        for (const task of area.tasks) {
          lines.push(this.formatTask(task));
        }
      }

      if (area.habits.length > 0) {
        lines.push('');
        lines.push('### Habits');
        lines.push('');
        for (const habit of area.habits) {
          lines.push(this.formatHabit(habit));
        }
      }
    }

    const { goals, tasks, habits } = data.unlinked;
    if (goals.length > 0 || tasks.length > 0 || habits.length > 0) {
      lines.push('');
      lines.push('---');
      lines.push('');
      lines.push('## Unlinked');

      if (goals.length > 0) {
        lines.push('');
        lines.push('### Goals');
        for (const goal of goals) {
          this.renderGoal(lines, goal);
        }
      }

      if (tasks.length > 0) {
        lines.push('');
        lines.push('### Tasks');
        lines.push('');
        for (const task of tasks) {
          lines.push(this.formatTask(task));
        }
      }

      if (habits.length > 0) {
        lines.push('');
        lines.push('### Habits');
        lines.push('');
        for (const habit of habits) {
          lines.push(this.formatHabit(habit));
        }
      }
    }

    lines.push('');
    return lines.join('\n');
  }

  private renderGoal(lines: string[], goal: ExportGoal): void {
    lines.push('');
    lines.push(`#### ${goal.title}`);
    lines.push('');

    const progressBar = this.buildProgressBar(goal.progress);
    const targetCol = goal.targetDate ?? '—';

    lines.push('| Status | Progress | Priority | Target |');
    lines.push('|--------|----------|----------|--------|');
    lines.push(`| ${goal.status} | ${progressBar} ${goal.progress}% | ${goal.priority} | ${targetCol} |`);

    if (goal.description) {
      lines.push('');
      lines.push(goal.description);
    }

    if (goal.milestones.length > 0) {
      lines.push('');
      lines.push('**Milestones**');
      lines.push('');
      for (const ms of goal.milestones) {
        const check = ms.done ? 'x' : ' ';
        lines.push(`- [${check}] ${ms.title}`);
      }
    }

    if (goal.tasks.length > 0) {
      lines.push('');
      lines.push('**Tasks**');
      lines.push('');
      for (const task of goal.tasks) {
        lines.push(this.formatTask(task));
      }
    }

    if (goal.habits.length > 0) {
      lines.push('');
      lines.push('**Habits**');
      lines.push('');
      for (const habit of goal.habits) {
        lines.push(this.formatHabit(habit));
      }
    }
  }

  private formatTask(task: ExportTask): string {
    const check = task.status === 'done' ? 'x' : ' ';
    let line = `- [${check}] **${task.priority}** ${task.title}`;
    if (task.dueDate) {
      line += ` — due ${task.dueDate}`;
    }
    if (task.status === 'in_progress') {
      line += ' *(in progress)*';
    }
    return line;
  }

  private formatHabit(habit: ExportHabit): string {
    let freq = habit.frequency;
    if (habit.frequency === 'specific_days' && habit.days) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      freq = habit.days.map(d => dayNames[d]).join(', ');
    }
    let line = `- ${habit.title} (${freq})`;
    line += ` — streak: ${habit.currentStreak}`;
    if (habit.bestStreak > 0) {
      line += ` / best: ${habit.bestStreak}`;
    }
    if (!habit.active) {
      line += ' *(archived)*';
    }
    return line;
  }

  private buildProgressBar(progress: number): string {
    const filled = Math.round(progress / 10);
    const empty = 10 - filled;
    return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
  }
}
