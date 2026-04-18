import { Link } from 'react-router-dom';
import {
  useTrial,
  useBillingStatus,
  useBillingSelf,
  useStartCheckout,
  useOpenPortal,
} from '../hooks/use-api';

export function SubscribePage() {
  const { data: trial } = useTrial();
  const { data: billing } = useBillingStatus();
  const { data: self } = useBillingSelf();
  const checkout = useStartCheckout();
  const portal = useOpenPortal();

  const billingConfigured = !!billing?.configured;
  const hasActiveSub = self?.subscriptionStatus === 'active';
  const busy = checkout.isPending || portal.isPending;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-2">
          <Link
            to="/"
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)]"
          >
            ← Back
          </Link>
          <h1 className="text-3xl font-bold text-[var(--color-text-accent)]">
            Keep using Planner AI
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            {headlineFor(trial?.state, trial?.daysRemaining ?? 0)}
          </p>
        </header>

        {self?.hasStripeCustomer && (
          <section className="rounded border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-4 flex items-center justify-between gap-4">
            <div className="text-sm">
              <p className="font-medium text-[var(--color-text-primary)]">
                Subscription: {self.subscriptionStatus ?? 'unknown'}
                {self.plan ? ` · ${self.plan}` : ''}
              </p>
              {self.subscriptionExpiresAt && (
                <p className="text-[var(--color-text-secondary)]">
                  Renews / ends:{' '}
                  {new Date(self.subscriptionExpiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              onClick={() => portal.mutate()}
              disabled={busy}
              className="px-3 py-2 rounded border border-[var(--color-border)] hover:border-[var(--color-border-active)] text-sm disabled:opacity-50"
            >
              Manage subscription
            </button>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2">
          <PlanCard
            title="Monthly"
            price="€1"
            cadence="per month"
            highlight={false}
            description="Flexibility to cancel any time."
            disabled={!billingConfigured || hasActiveSub || busy}
            onClick={() => checkout.mutate('monthly')}
          />
          <PlanCard
            title="Yearly"
            price="€10"
            cadence="per year"
            highlight={true}
            description="Save ~17% vs. monthly billing."
            disabled={!billingConfigured || hasActiveSub || busy}
            onClick={() => checkout.mutate('yearly')}
          />
        </section>

        {!billingConfigured && (
          <section className="rounded border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-4 text-sm text-[var(--color-text-primary)]">
            <p className="font-medium mb-1">Payments not configured yet</p>
            <p className="text-[var(--color-text-secondary)]">
              Stripe env vars haven&apos;t been set on this deployment. Once an
              admin adds them, the buttons above become live.
            </p>
          </section>
        )}

        {(checkout.isError || portal.isError) && (
          <section className="rounded border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 p-4 text-sm text-[var(--color-error)]">
            {checkout.error instanceof Error
              ? checkout.error.message
              : portal.error instanceof Error
                ? portal.error.message
                : 'Something went wrong.'}
          </section>
        )}
      </div>
    </div>
  );
}

function headlineFor(state: string | undefined, days: number): string {
  if (state === 'trial_expired')
    return 'Your 7-day free trial has ended. Pick a plan to continue using the AI assistant.';
  if (state === 'active')
    return 'You have an active subscription. Thank you for supporting Planner!';
  if (state === 'admin') return 'You are an admin — AI access is unlimited.';
  return `You're on the free trial — ${days} day${days === 1 ? '' : 's'} left. You can subscribe any time.`;
}

interface PlanCardProps {
  title: string;
  price: string;
  cadence: string;
  description: string;
  highlight: boolean;
  disabled: boolean;
  onClick: () => void;
}

function PlanCard({
  title,
  price,
  cadence,
  description,
  highlight,
  disabled,
  onClick,
}: PlanCardProps) {
  return (
    <div
      className={`rounded border p-5 flex flex-col gap-3 ${
        highlight
          ? 'border-[var(--color-accent-1)] bg-[var(--color-bg-highlight)]'
          : 'border-[var(--color-border)] bg-[var(--color-bg-panel)]'
      }`}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {title}
        </h2>
        {highlight && (
          <span className="text-xs uppercase tracking-wide text-[var(--color-accent-1)]">
            Best value
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold text-[var(--color-text-accent)]">
          {price}
        </span>
        <span className="text-sm text-[var(--color-text-secondary)]">
          {cadence}
        </span>
      </div>
      <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>
      <button
        onClick={onClick}
        disabled={disabled}
        className="mt-2 px-3 py-2 rounded bg-[var(--color-accent-1)] text-[var(--color-bg)] font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {disabled ? 'Unavailable' : 'Subscribe'}
      </button>
    </div>
  );
}
