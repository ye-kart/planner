export function StreakDisplay({ current, best }: { current: number; best: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span style={{ color: current > 0 ? 'var(--color-streak-fire)' : 'var(--color-text-secondary)' }}>
        {current > 0 ? '\u{1F525}' : '\u{2014}'}
      </span>
      <span className="font-mono" style={{ color: 'var(--color-streak-fire)' }}>{current}</span>
      {best > 0 && (
        <span className="text-xs text-[var(--color-text-secondary)]">(best: {best})</span>
      )}
    </span>
  );
}
