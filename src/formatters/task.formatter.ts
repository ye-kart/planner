import type { Task } from '../db/schema.js';

export function formatTaskList(tasks: Task[]): string {
  if (tasks.length === 0) return 'No tasks found.';

  const lines: string[] = ['Tasks:', ''];
  for (const t of tasks) {
    const icon = t.status === 'done' ? 'x' : t.status === 'in_progress' ? '~' : ' ';
    const due = t.dueDate ? `  due: ${t.dueDate}` : '';
    lines.push(`  [${icon}] ${t.id}  ${t.title}  [${t.priority}]${due}`);
  }
  return lines.join('\n');
}

export function formatTaskDetail(task: Task): string {
  const lines: string[] = [];
  const icon = task.status === 'done' ? 'x' : task.status === 'in_progress' ? '~' : ' ';
  lines.push(`[${icon}] ${task.title}`);
  lines.push(`ID: ${task.id}  |  Status: ${task.status}  |  Priority: ${task.priority}`);
  if (task.dueDate) lines.push(`Due: ${task.dueDate}`);
  if (task.description) lines.push(`Description: ${task.description}`);
  if (task.areaId) lines.push(`Area: ${task.areaId}`);
  if (task.goalId) lines.push(`Goal: ${task.goalId}`);
  if (task.completedAt) lines.push(`Completed: ${task.completedAt}`);
  return lines.join('\n');
}

export function formatTask(task: Task): string {
  const icon = task.status === 'done' ? 'x' : task.status === 'in_progress' ? '~' : ' ';
  return `[${icon}] ${task.title} (${task.id})`;
}
