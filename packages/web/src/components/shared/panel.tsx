import type { ReactNode } from 'react';

export function Panel({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)] ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-accent)]">{title}</h2>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
