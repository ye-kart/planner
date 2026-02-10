import type { Habit, Completion } from '../db/schema.js';
import type { HabitDetail, HabitStreakOverview } from '../services/habit.service.js';

export function formatHabitList(habits: Habit[]): string {
  if (habits.length === 0) return 'No habits found.';

  const lines: string[] = ['Habits:', ''];
  for (const h of habits) {
    const freq = h.frequency === 'specific_days' && h.days
      ? `specific_days (${formatDays(JSON.parse(h.days))})`
      : h.frequency;
    lines.push(`  ${h.id}  ${h.title}  (${freq})  streak: ${h.currentStreak}/${h.bestStreak}`);
  }
  return lines.join('\n');
}

export function formatHabitDetail(detail: HabitDetail): string {
  const lines: string[] = [];
  lines.push(`Habit: ${detail.title}`);
  lines.push(`Frequency: ${detail.frequency}${detail.days ? ` (${formatDays(JSON.parse(detail.days))})` : ''}`);
  lines.push(`Active: ${detail.active ? 'yes' : 'no'}`);
  lines.push(`Current streak: ${detail.currentStreak}  |  Best streak: ${detail.bestStreak}`);
  if (detail.area) lines.push(`Area: ${detail.area.name}`);
  if (detail.goal) lines.push(`Goal: ${detail.goal.title}`);
  lines.push('');

  if (detail.recentCompletions.length > 0) {
    lines.push('Recent completions:');
    for (const c of detail.recentCompletions.slice(0, 10)) {
      const note = c.note ? ` — ${c.note}` : '';
      lines.push(`  ${c.date}${note}`);
    }
  }

  return lines.join('\n');
}

export function formatHabit(habit: Habit): string {
  return `Habit: ${habit.title} (${habit.id}) [${habit.frequency}]`;
}

export function formatCompletion(completion: Completion): string {
  return `Checked: ${completion.date} (${completion.habitId})`;
}

export function formatStreaks(streaks: HabitStreakOverview[]): string {
  if (streaks.length === 0) return 'No active habits.';

  const lines: string[] = ['Habit Streaks:', ''];
  for (const s of streaks) {
    const bar = '|'.repeat(Math.min(s.currentStreak, 30));
    lines.push(`  ${s.title.padEnd(25)}  current: ${String(s.currentStreak).padStart(3)}  best: ${String(s.bestStreak).padStart(3)}  ${bar}`);
  }
  return lines.join('\n');
}

function formatDays(days: number[]): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.map(d => names[d]).join(', ');
}
