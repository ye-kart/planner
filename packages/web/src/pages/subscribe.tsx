import { Link, Navigate } from 'react-router-dom';
import { useTrial } from '../hooks/use-api';
import { getSubscriptionRedirect } from '../utils/billing';

export function SubscribePage() {
  const { data: trial } = useTrial();

  if (!trial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-text-secondary)]">
        Loading...
      </div>
    );
  }

  const redirect = getSubscriptionRedirect(trial);
  if (redirect) return <Navigate to={redirect} replace />;

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
            {trial.state === 'trial_expired'
              ? 'Your 7-day free trial has ended. Pick a plan to continue using the AI assistant.'
              : trial.state === 'active'
                ? 'You have an active subscription. Thank you for supporting Planner!'
                : `You're on the free trial — ${trial.daysRemaining} day${trial.daysRemaining === 1 ? '' : 's'} left. You can subscribe any time.`}
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <PlanCard
            title="Monthly"
            price="€1"
            cadence="per month"
            highlight={false}
            description="Flexibility to cancel any time."
          />
          <PlanCard
            title="Yearly"
            price="€10"
            cadence="per year"
            highlight={true}
            description="Save ~17% vs. monthly billing."
          />
        </section>

        <section className="rounded border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-4 text-sm text-[var(--color-text-secondary)]">
          <p className="font-medium text-[var(--color-text-primary)] mb-1">
            Payments coming soon
          </p>
          <p>
            We&apos;re rolling out the trial first so you can try the AI
            assistant end-to-end. Payment processing will be enabled shortly —
            your access won&apos;t be interrupted during the switch-over.
          </p>
        </section>
      </div>
    </div>
  );
}

interface PlanCardProps {
  title: string;
  price: string;
  cadence: string;
  description: string;
  highlight: boolean;
}

function PlanCard({ title, price, cadence, description, highlight }: PlanCardProps) {
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
        disabled
        className="mt-2 px-3 py-2 rounded bg-[var(--color-accent-1)] text-[var(--color-bg)] font-medium opacity-60 cursor-not-allowed"
      >
        Subscribe (coming soon)
      </button>
    </div>
  );
}
