import { useLocation } from 'react-router-dom';

const globalHints = [
  { key: '1-5', label: 'Navigate' },
  { key: 't', label: 'Theme' },
  { key: 'c', label: 'Chat' },
  { key: '/', label: 'Search' },
];

const screenHints: Record<string, Array<{ key: string; label: string }>> = {
  '/': [],
  '/areas': [
    { key: 'n', label: 'New' },
    { key: 'e', label: 'Edit' },
    { key: 'x', label: 'Delete' },
  ],
  '/goals': [
    { key: 'n', label: 'New' },
    { key: 'e', label: 'Edit' },
    { key: 'd', label: 'Done' },
    { key: 'f', label: 'Filter' },
  ],
  '/tasks': [
    { key: 'n', label: 'New' },
    { key: 'e', label: 'Edit' },
    { key: 'd', label: 'Done' },
    { key: 's', label: 'Start' },
    { key: 'f', label: 'Filter' },
  ],
  '/habits': [
    { key: 'n', label: 'New' },
    { key: 'Space', label: 'Toggle' },
    { key: 'v', label: 'View' },
  ],
};

export function KeyboardHintBar() {
  const location = useLocation();
  const hints = [...globalHints, ...(screenHints[location.pathname] ?? [])];

  return (
    <div className="h-8 px-4 flex items-center gap-4 border-t border-[var(--color-border)] bg-[var(--color-bg-panel)] text-xs text-[var(--color-text-secondary)]">
      {hints.map((h) => (
        <span key={h.key} className="flex items-center gap-1">
          <kbd className="px-1 rounded bg-[var(--color-bg-highlight)] text-[var(--color-text-accent)] font-mono">
            {h.key}
          </kbd>
          <span>{h.label}</span>
        </span>
      ))}
    </div>
  );
}
