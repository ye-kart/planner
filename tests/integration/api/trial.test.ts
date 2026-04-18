import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp } from './helpers';
import type { ApiContainer } from '@planner/api';

let container: ApiContainer;

beforeEach(() => {
  ({ container } = createTestApp());
});

describe('Trial gating wiring', () => {
  it('container exposes trialService', () => {
    expect(container.trialService).toBeDefined();
    expect(typeof container.trialService.ensureTrial).toBe('function');
    expect(typeof container.trialService.getStatus).toBe('function');
  });

  it('ensureTrial + getStatus round-trip through the api container', () => {
    container.trialService.ensureTrial('github:alice');
    const status = container.trialService.getStatus('github:alice');
    expect(status.state).toBe('trial');
    expect(status.hasAiAccess).toBe(true);
    expect(status.daysRemaining).toBeGreaterThan(0);
    expect(status.daysRemaining).toBeLessThanOrEqual(7);
  });

  it('users without a trial row are treated as expired', () => {
    const status = container.trialService.getStatus('github:ghost');
    expect(status.state).toBe('trial_expired');
    expect(status.hasAiAccess).toBe(false);
  });
});
