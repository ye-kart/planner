export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`h-2 rounded-full bg-[var(--color-progress-track)] overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full bg-[var(--color-progress-fill)] transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
