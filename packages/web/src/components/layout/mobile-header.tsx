import { useCurrentSpace } from '../../contexts/space-context';
import { useSpaces } from '../../hooks/use-api';

interface MobileHeaderProps {
  onMenuToggle: () => void;
  onChatToggle: () => void;
}

export function MobileHeader({ onMenuToggle, onChatToggle }: MobileHeaderProps) {
  const { spaceId } = useCurrentSpace();
  const { data: spaces } = useSpaces();
  const currentSpace = spaces?.find(s => s.id === spaceId);

  return (
    <div className="md:hidden flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-panel)]">
      <button
        onClick={onMenuToggle}
        className="p-2 -ml-1 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)] hover:bg-[var(--color-bg-highlight)] active:opacity-70 transition-colors"
        aria-label="Toggle menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="5" x2="17" y2="5" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="15" x2="17" y2="15" />
        </svg>
      </button>
      <span className="text-sm font-bold text-[var(--color-text-accent)] flex items-center gap-1.5">
        <span>{currentSpace?.icon ?? '📁'}</span>
        <span className="truncate max-w-[180px]">{currentSpace?.name ?? 'Planner'}</span>
      </span>
      <button
        onClick={onChatToggle}
        className="p-2 -mr-1 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)] hover:bg-[var(--color-bg-highlight)] active:opacity-70 transition-colors"
        aria-label="Toggle chat"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7l-4 3V6a2 2 0 0 1 2-2z" />
        </svg>
      </button>
    </div>
  );
}
