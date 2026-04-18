import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from './helpers/db.js';
import {
  UserTrialRepository,
  AllowedUserRepository,
  TrialService,
  TRIAL_DURATION_DAYS,
  generateId,
  type DB,
} from '@planner/core';

let db: DB;
let service: TrialService;
let trialRepo: UserTrialRepository;
let allowedUserRepo: AllowedUserRepository;

beforeEach(() => {
  db = createTestDb();
  trialRepo = new UserTrialRepository(db);
  allowedUserRepo = new AllowedUserRepository(db);
  service = new TrialService(trialRepo, allowedUserRepo);
});

describe('TrialService', () => {
  it('creates a trial record with 7-day window on first call', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    service.ensureTrial('github:alice', now);

    const row = trialRepo.findByUserId('github:alice');
    expect(row).toBeDefined();
    expect(row!.trialStartedAt).toBe(now.toISOString());
    const expires = new Date(row!.trialExpiresAt).getTime() - now.getTime();
    expect(expires).toBe(TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
    expect(row!.subscriptionStatus).toBe('trial');
  });

  it('is idempotent — calling ensureTrial twice keeps the original start date', () => {
    const first = new Date('2026-01-01T00:00:00Z');
    const second = new Date('2026-01-05T00:00:00Z');
    service.ensureTrial('github:alice', first);
    service.ensureTrial('github:alice', second);

    const row = trialRepo.findByUserId('github:alice')!;
    expect(row.trialStartedAt).toBe(first.toISOString());
  });

  it('reports trial state with days remaining during the trial window', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    service.ensureTrial('github:alice', start);

    const day3 = new Date('2026-01-04T00:00:00Z');
    const status = service.getStatus('github:alice', day3);
    expect(status.state).toBe('trial');
    expect(status.hasAiAccess).toBe(true);
    expect(status.daysRemaining).toBe(4); // 7 - 3
  });

  it('reports trial_expired after 7 days and blocks AI access', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    service.ensureTrial('github:alice', start);

    const after = new Date('2026-01-10T00:00:00Z');
    const status = service.getStatus('github:alice', after);
    expect(status.state).toBe('trial_expired');
    expect(status.hasAiAccess).toBe(false);
    expect(status.daysRemaining).toBe(0);
  });

  it('treats users without a trial row as expired (defensive)', () => {
    const status = service.getStatus('github:unknown');
    expect(status.state).toBe('trial_expired');
    expect(status.hasAiAccess).toBe(false);
  });

  it('bypasses the gate for admin users', () => {
    allowedUserRepo.create({
      id: generateId(),
      provider: 'github',
      username: 'root',
      isAdmin: true,
      createdAt: new Date().toISOString(),
    });

    const status = service.getStatus('github:root');
    expect(status.state).toBe('admin');
    expect(status.hasAiAccess).toBe(true);
  });

  it('grants access when an active subscription is present, even after trial expires', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    service.ensureTrial('github:alice', start);

    const subExpires = new Date('2026-03-01T00:00:00Z');
    trialRepo.update('github:alice', {
      subscriptionStatus: 'active',
      plan: 'monthly',
      subscriptionExpiresAt: subExpires.toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const after = new Date('2026-02-01T00:00:00Z'); // past trial, inside sub
    const status = service.getStatus('github:alice', after);
    expect(status.state).toBe('active');
    expect(status.hasAiAccess).toBe(true);
    expect(status.plan).toBe('monthly');
  });

  it('falls back to expired when subscription has itself lapsed', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    service.ensureTrial('github:alice', start);

    trialRepo.update('github:alice', {
      subscriptionStatus: 'active',
      plan: 'monthly',
      subscriptionExpiresAt: '2026-01-20T00:00:00Z',
      updatedAt: new Date().toISOString(),
    });

    const after = new Date('2026-02-01T00:00:00Z');
    const status = service.getStatus('github:alice', after);
    expect(status.state).toBe('trial_expired');
    expect(status.hasAiAccess).toBe(false);
  });
});
