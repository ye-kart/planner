import type { UserTrialRepository } from '../repositories/user-trial.repository.js';
import type { AllowedUserRepository } from '../repositories/allowed-user.repository.js';
import { normalizeUsername } from '../utils/identity.js';

export const TRIAL_DURATION_DAYS = 7;

export type TrialStatusState =
  | 'trial'
  | 'trial_expired'
  | 'active'
  | 'admin';

export interface TrialStatus {
  state: TrialStatusState;
  trialStartedAt: string | null;
  trialExpiresAt: string | null;
  subscriptionExpiresAt: string | null;
  plan: 'monthly' | 'yearly' | null;
  daysRemaining: number;
  hasAiAccess: boolean;
}

export class TrialService {
  constructor(
    private trialRepo: UserTrialRepository,
    private allowedUserRepo: AllowedUserRepository
  ) {}

  // Idempotent: creates the trial record on first call, returns existing one otherwise.
  ensureTrial(userId: string, now: Date = new Date()): void {
    const existing = this.trialRepo.findByUserId(userId);
    if (existing) return;

    const nowIso = now.toISOString();
    const expires = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

    this.trialRepo.create({
      userId,
      trialStartedAt: nowIso,
      trialExpiresAt: expires.toISOString(),
      subscriptionStatus: 'trial',
      plan: null,
      subscriptionExpiresAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  getStatus(userId: string, now: Date = new Date()): TrialStatus {
    if (this.isAdmin(userId)) {
      return {
        state: 'admin',
        trialStartedAt: null,
        trialExpiresAt: null,
        subscriptionExpiresAt: null,
        plan: null,
        daysRemaining: Number.POSITIVE_INFINITY,
        hasAiAccess: true,
      };
    }

    const trial = this.trialRepo.findByUserId(userId);
    if (!trial) {
      return {
        state: 'trial_expired',
        trialStartedAt: null,
        trialExpiresAt: null,
        subscriptionExpiresAt: null,
        plan: null,
        daysRemaining: 0,
        hasAiAccess: false,
      };
    }

    // Active paid subscription takes precedence
    if (trial.subscriptionStatus === 'active' && trial.subscriptionExpiresAt) {
      const subExpires = new Date(trial.subscriptionExpiresAt);
      if (subExpires > now) {
        return {
          state: 'active',
          trialStartedAt: trial.trialStartedAt,
          trialExpiresAt: trial.trialExpiresAt,
          subscriptionExpiresAt: trial.subscriptionExpiresAt,
          plan: trial.plan ?? null,
          daysRemaining: daysBetween(now, subExpires),
          hasAiAccess: true,
        };
      }
    }

    const trialExpires = new Date(trial.trialExpiresAt);
    const inTrial = trialExpires > now;

    return {
      state: inTrial ? 'trial' : 'trial_expired',
      trialStartedAt: trial.trialStartedAt,
      trialExpiresAt: trial.trialExpiresAt,
      subscriptionExpiresAt: trial.subscriptionExpiresAt,
      plan: trial.plan ?? null,
      daysRemaining: inTrial ? daysBetween(now, trialExpires) : 0,
      hasAiAccess: inTrial,
    };
  }

  private isAdmin(userId: string): boolean {
    const [provider, username] = userId.split(':');
    if (!provider || !username) return false;
    return this.allowedUserRepo.isAdmin(provider, normalizeUsername(username));
  }
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
