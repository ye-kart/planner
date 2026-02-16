import { useState } from 'react';

interface ToolCallDisplayProps {
  content: string;
  toolCallId: string;
}

export function ToolCallDisplay({ content }: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  let parsed: { success?: boolean; message?: string } = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { message: content };
  }

  return (
    <div className="text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)]"
      >
        <span className="font-mono">{expanded ? '\u25BC' : '\u25B6'}</span>
        <span className={parsed.success ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}>
          {parsed.message ?? 'Tool result'}
        </span>
      </button>
      {expanded && (
        <pre className="mt-1 p-2 rounded bg-[var(--color-bg)] text-[var(--color-text-secondary)] overflow-auto max-h-32 text-xs">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      )}
    </div>
  );
}
