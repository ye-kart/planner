import { useLocation } from 'react-router-dom';

const globalHints = [
  { key: '1-5', label: 'Navigate' },
  { key: 't', label: 'Theme' },
  { key: 'c', label: 'Chat' },
];

const screenHints: Record<string, Array<{ key: string; label: string }>> = {
  '/': [
    { key: 'j/k', label: 'Navigate' },
    { key: 'Space', label: 'Toggle' },
  ],
  '/areas': [
    { key: 'j/k', label: 'Navigate' },
    { key: 'n', label: 'New' },
    { key: 'e', label: 'Edit' },
    { key: 'x', label: 'Delete' },
    { key: 'Esc', label: 'Cancel' },
  ],
  '/goals': [
    { key: 'j/k', label: 'Navigate' },
    { key: 'n', label: 'New' },
    { key: 'e', label: 'Edit' },
    { key: 'x', label: 'Delete' },
    { key: 'd', label: 'Done' },
    { key: 'f', label: 'Filter' },
    { key: 'Esc', label: 'Cancel' },
  ],
  '/tasks': [
    { key: 'j/k', label: 'Navigate' },
    { key: 'n', label: 'New' },
    { key: 'e', label: 'Edit' },
    { key: 'x', label: 'Delete' },
    { key: 'd', label: 'Done' },
    { key: 's', label: 'Start' },
    { key: 'f', label: 'Filter' },
    { key: 'Esc', label: 'Cancel' },
  ],
  '/habits': [
    { key: 'j/k', label: 'Navigate' },
    { key: 'n', label: 'New' },
    { key: 'e', label: 'Edit' },
    { key: 'x', label: 'Delete' },
    { key: 'Space', label: 'Toggle' },
    { key: 'v', label: 'View' },
    { key: 'Esc', label: 'Cancel' },
  ],
};

export function KeyboardHintBar() {
  const location = useLocation();
  const hints = [...globalHints, ...(screenHints[location.pathname] ?? [])];

  return (
    <div className="hidden md:flex h-8 px-4 items-center gap-4 border-t border-[var(--color-border)] bg-[var(--color-bg-panel)] text-xs text-[var(--color-text-secondary)]">
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
