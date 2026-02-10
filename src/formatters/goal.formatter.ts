import type { Goal, Milestone } from '../db/schema.js';
import type { GoalDetail } from '../services/goal.service.js';

export function formatGoalList(goals: Goal[]): string {
  if (goals.length === 0) return 'No goals found.';

  const lines: string[] = ['Goals:', ''];
  for (const g of goals) {
    const priority = `[${g.priority}]`;
    const target = g.targetDate ? `  due: ${g.targetDate}` : '';
    lines.push(`  ${g.id}  ${g.title}  [${g.status}]  ${g.progress}%  ${priority}${target}`);
  }
  return lines.join('\n');
}

export function formatGoalDetail(detail: GoalDetail): string {
  const lines: string[] = [];
  lines.push(`Goal: ${detail.title}`);
  lines.push(`Status: ${detail.status}  |  Progress: ${detail.progress}%  |  Priority: ${detail.priority}`);
  if (detail.area) lines.push(`Area: ${detail.area.name}`);
  if (detail.targetDate) lines.push(`Target: ${detail.targetDate}`);
  if (detail.description) lines.push(`Description: ${detail.description}`);
  lines.push('');

  if (detail.milestones.length > 0) {
    lines.push('Milestones:');
    for (const m of detail.milestones) {
      const icon = m.done ? 'x' : ' ';
      lines.push(`  [${icon}] ${m.id}  ${m.title}`);
    }
    lines.push('');
  }

  if (detail.tasks.length > 0) {
    lines.push('Tasks:');
    for (const t of detail.tasks) {
      const icon = t.status === 'done' ? 'x' : t.status === 'in_progress' ? '~' : ' ';
      lines.push(`  [${icon}] ${t.id}  ${t.title}  [${t.priority}]`);
    }
    lines.push('');
  }

  if (detail.habits.length > 0) {
    lines.push('Habits:');
    for (const h of detail.habits) {
      lines.push(`  ${h.id}  ${h.title}  (${h.frequency})  streak: ${h.currentStreak}`);
    }
  }

  return lines.join('\n');
}

export function formatGoal(goal: Goal): string {
  return `Goal: ${goal.title} (${goal.id}) [${goal.status}] ${goal.progress}%`;
}

export function formatMilestone(ms: Milestone): string {
  const icon = ms.done ? 'x' : ' ';
  return `[${icon}] ${ms.title} (${ms.id})`;
}
