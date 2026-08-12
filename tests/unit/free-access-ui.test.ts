import {
  getSubscriptionRedirect,
  shouldShowTrialBanner,
} from '../../packages/web/src/utils/billing';
import type { TrialStatus, TrialStatusState } from '../../packages/web/src/api/types';

describe('free access UI policy', () => {
  it('redirects anonymous users to sign in', () => {
    expect(getSubscriptionRedirect(status('none', false))).toBe('/login');
  });

  it('redirects authenticated free users away from subscription UI', () => {
    const free = status('free', false);
    expect(getSubscriptionRedirect(free)).toBe('/');
    expect(shouldShowTrialBanner(free)).toBe(false);
  });

  it('preserves subscription UI when billing is enabled', () => {
    const trial = status('trial', true);
    expect(getSubscriptionRedirect(trial)).toBeNull();
    expect(shouldShowTrialBanner(trial)).toBe(true);
  });
});

function status(state: TrialStatusState, billingEnabled: boolean): TrialStatus {
  return {
    state,
    billingEnabled,
    trialStartedAt: null,
    trialExpiresAt: null,
    subscriptionExpiresAt: null,
    plan: null,
    daysRemaining: 0,
    hasAiAccess: state === 'free' || state === 'trial',
  };
}
