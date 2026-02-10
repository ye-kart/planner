import type { StatusData } from '../services/status.service.js';

const PRIORITY_ICONS: Record<string, string> = {
  urgent: '!',
  high: '●',
  medium: '○',
  low: '·',
};

export function formatStatus(data: StatusData): string {
  const lines: string[] = [];
  lines.push(`Today — ${data.dateFormatted}`);
  lines.push('');
  lines.push(`  Tasks due today          ${data.summary.tasksDue}`);
  lines.push(`  Overdue tasks            ${data.summary.tasksOverdue}`);
  lines.push(`  Habits due today         ${data.summary.habitsDue} (${data.summary.habitsDone} done)`);
  if (data.summary.bestActiveStreak) {
    lines.push(`  Current best streak      ${data.summary.bestActiveStreak.streak} days (${data.summary.bestActiveStreak.habit})`);
  }

  if (data.tasksDueToday.length > 0 || data.tasksOverdue.length > 0) {
    lines.push('');
    lines.push('Due Tasks:');
    for (const t of data.tasksDueToday) {
      const icon = PRIORITY_ICONS[t.priority] ?? '○';
      lines.push(`  ${icon} [${t.priority}]  ${t.title}  (due today)`);
    }
    for (const t of data.tasksOverdue) {
      const daysOver = (t as any).daysOverdue ?? '?';
      lines.push(`  ⚠ [${t.priority}]  ${t.title}  (${daysOver} day${daysOver === 1 ? '' : 's'} overdue)`);
    }
  }

  if (data.habitsDueToday.length > 0) {
    lines.push('');
    lines.push('Habits:');
    for (const h of data.habitsDueToday) {
      const icon = h.done ? '✓' : '○';
      lines.push(`  ${icon} ${h.title.padEnd(25)} streak: ${h.currentStreak}`);
    }
  }

  return lines.join('\n');
}
