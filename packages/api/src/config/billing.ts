import type { TrialStatus, TrialStatusState } from '@planner/core';

export interface BillingConfig {
  enabled: boolean;
}

export type AccessStatusState = TrialStatusState | 'free' | 'none';

export interface AccessStatus extends Omit<TrialStatus, 'state'> {
  state: AccessStatusState;
  billingEnabled: boolean;
}

export function getBillingConfig(env: NodeJS.ProcessEnv = process.env): BillingConfig {
  return {
    enabled: env.PLANNER_BILLING_ENABLED?.trim().toLowerCase() === 'true',
  };
}

export function createFreeAccessStatus(): AccessStatus {
  return {
    state: 'free',
    billingEnabled: false,
    trialStartedAt: null,
    trialExpiresAt: null,
    subscriptionExpiresAt: null,
    plan: null,
    daysRemaining: 0,
    hasAiAccess: true,
  };
}

export function createAnonymousAccessStatus(config: BillingConfig): AccessStatus {
  return {
    state: 'none',
    billingEnabled: config.enabled,
    trialStartedAt: null,
    trialExpiresAt: null,
    subscriptionExpiresAt: null,
    plan: null,
    daysRemaining: 0,
    hasAiAccess: false,
  };
}

export function createBillingAccessStatus(status: TrialStatus): AccessStatus {
  return {
    ...status,
    billingEnabled: true,
  };
}
