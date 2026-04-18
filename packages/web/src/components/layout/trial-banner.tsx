import { Link } from 'react-router-dom';
import { useTrial } from '../../hooks/use-api';

export function TrialBanner() {
  const { data } = useTrial();
  if (!data) return null;
  if (data.state === 'admin' || data.state === 'active') return null;

  if (data.state === 'trial_expired') {
    return (
      <div className="w-full bg-[var(--color-error)]/15 border-b border-[var(--color-error)]/40 text-[var(--color-text-primary)] px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <span>
          Your free trial has ended. Subscribe to keep using AI features.
        </span>
        <Link
          to="/subscribe"
          className="px-3 py-1 rounded bg-[var(--color-accent-1)] text-[var(--color-bg)] font-medium hover:opacity-90"
        >
          Subscribe
        </Link>
      </div>
    );
  }

  // state === 'trial'
  const days = data.daysRemaining;
  const low = days <= 2;
  return (
    <div
      className={`w-full px-4 py-2 flex items-center justify-between gap-3 text-sm border-b ${
        low
          ? 'bg-[var(--color-warning)]/15 border-[var(--color-warning)]/40'
          : 'bg-[var(--color-bg-highlight)] border-[var(--color-border)]'
      } text-[var(--color-text-primary)]`}
    >
      <span>
        Free trial:{' '}
        <strong>
          {days} day{days === 1 ? '' : 's'}
        </strong>{' '}
        remaining.
      </span>
      <Link
        to="/subscribe"
        className="px-3 py-1 rounded bg-[var(--color-accent-1)] text-[var(--color-bg)] font-medium hover:opacity-90"
      >
        Subscribe
      </Link>
    </div>
  );
}
