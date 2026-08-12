import type { TrialStatus } from '../api/types';

export type SubscriptionRedirect = '/' | '/login' | null;

export function getSubscriptionRedirect(status: TrialStatus): SubscriptionRedirect {
  if (status.state === 'none') return '/login';
  if (!status.billingEnabled || status.state === 'free') return '/';
  return null;
}

export function shouldShowTrialBanner(status: TrialStatus): boolean {
  return status.billingEnabled
    && (status.state === 'trial' || status.state === 'trial_expired');
}
