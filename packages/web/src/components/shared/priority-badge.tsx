const priorityColors: Record<string, string> = {
  low: 'var(--color-priority-low)',
  medium: 'var(--color-priority-med)',
  high: 'var(--color-priority-high)',
  urgent: 'var(--color-priority-urgent)',
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className="px-2 py-0.5 text-xs rounded font-mono uppercase whitespace-nowrap"
      style={{ color: priorityColors[priority], borderColor: priorityColors[priority], border: '1px solid' }}
    >
      {priority}
    </span>
  );
}
