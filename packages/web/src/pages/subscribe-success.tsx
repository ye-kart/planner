import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTrial, useBillingSelf } from '../hooks/use-api';

export function SubscribeSuccessPage() {
  const qc = useQueryClient();
  const { data: trial } = useTrial();
  const { data: self } = useBillingSelf();

  // Stripe fires the webhook asynchronously — poll the trial endpoint briefly
  // so the UI flips from "trial" → "active" once the server catches up.
  useEffect(() => {
    let tries = 0;
    const maxTries = 6; // ~12s
    const interval = setInterval(() => {
      tries += 1;
      qc.invalidateQueries({ queryKey: ['auth', 'trial'] });
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      qc.invalidateQueries({ queryKey: ['billing', 'self'] });
      if (tries >= maxTries) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [qc]);

  const isActive = trial?.state === 'active' || self?.subscriptionStatus === 'active';

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] px-4 py-10">
      <div className="max-w-xl mx-auto text-center space-y-6">
        <h1 className="text-3xl font-bold text-[var(--color-text-accent)]">
          {isActive ? 'You are subscribed' : 'Finalizing your subscription…'}
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          {isActive
            ? 'AI features are unlocked. Thanks for supporting Planner!'
            : 'Stripe is confirming your payment. This page will update in a few seconds.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/"
            className="px-4 py-2 rounded bg-[var(--color-accent-1)] text-[var(--color-bg)] font-medium hover:opacity-90"
          >
            Back to planner
          </Link>
          <Link
            to="/subscribe"
            className="px-4 py-2 rounded border border-[var(--color-border)] hover:border-[var(--color-border-active)]"
          >
            Manage subscription
          </Link>
        </div>
      </div>
    </div>
  );
}
