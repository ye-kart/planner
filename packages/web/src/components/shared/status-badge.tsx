const statusStyles: Record<string, { color: string; label: string }> = {
  todo: { color: 'var(--color-text-secondary)', label: 'To Do' },
  in_progress: { color: 'var(--color-accent-1)', label: 'In Progress' },
  done: { color: 'var(--color-success)', label: 'Done' },
  active: { color: 'var(--color-accent-1)', label: 'Active' },
  archived: { color: 'var(--color-text-secondary)', label: 'Archived' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = statusStyles[status] ?? { color: 'var(--color-text-secondary)', label: status };
  return (
    <span className="px-2 py-0.5 text-xs rounded font-mono" style={{ color: s.color, borderColor: s.color, border: '1px solid' }}>
      {s.label}
    </span>
  );
}
