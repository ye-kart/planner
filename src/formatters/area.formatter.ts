import type { AreaWithStats, AreaDetail } from '../services/area.service.js';

export function formatAreaList(areas: AreaWithStats[]): string {
  if (areas.length === 0) return 'No areas found.';

  const lines: string[] = ['Areas:', ''];
  for (const area of areas) {
    const stats = `${area.goalCount} goals, ${area.taskCount} tasks, ${area.habitCount} habits`;
    lines.push(`  ${area.id}  ${area.name}`);
    if (area.description) lines.push(`          ${area.description}`);
    lines.push(`          ${stats}`);
    lines.push('');
  }
  return lines.join('\n');
}

export function formatAreaDetail(area: AreaDetail): string {
  const lines: string[] = [];
  lines.push(`Area: ${area.name}`);
  if (area.description) lines.push(`Description: ${area.description}`);
  lines.push('');

  if (area.goals.length > 0) {
    lines.push('Goals:');
    for (const g of area.goals) {
      lines.push(`  ${g.id}  ${g.title}  [${g.status}]  ${g.progress}%`);
    }
    lines.push('');
  }

  if (area.tasks.length > 0) {
    lines.push('Tasks:');
    for (const t of area.tasks) {
      const icon = t.status === 'done' ? 'x' : t.status === 'in_progress' ? '~' : ' ';
      lines.push(`  [${icon}] ${t.id}  ${t.title}  [${t.priority}]`);
    }
    lines.push('');
  }

  if (area.habits.length > 0) {
    lines.push('Habits:');
    for (const h of area.habits) {
      lines.push(`  ${h.id}  ${h.title}  (${h.frequency})  streak: ${h.currentStreak}`);
    }
  }

  return lines.join('\n');
}

export function formatArea(area: import('../db/schema.js').Area): string {
  const lines = [`Created area: ${area.name} (${area.id})`];
  if (area.description) lines.push(`Description: ${area.description}`);
  return lines.join('\n');
}
