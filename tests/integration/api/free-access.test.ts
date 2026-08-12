import { afterEach, describe, expect, it } from 'vitest';
import type { ApiContainer } from '@planner/api';
import { createTestApp } from './helpers';

afterEach(() => {
  delete process.env.PLANNER_GITHUB_CLIENT_ID;
  delete process.env.PLANNER_GOOGLE_CLIENT_ID;
  delete process.env.PLANNER_RESEND_API_KEY;
  delete process.env.PLANNER_EMAIL_FROM;
});

describe('free access mode', () => {
  it('reports anonymous users without inventing trial state', async () => {
    const { app } = createTestApp();

    const response = await app.request('/api/auth/trial');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      state: 'none',
      billingEnabled: false,
      daysRemaining: 0,
      hasAiAccess: false,
    });
  });

  it('gives authenticated users free AI access without creating a trial', async () => {
    const { app, container } = createTestApp();
    const cookie = createSessionCookie(container, 'github:alice');

    const trialResponse = await app.request('/api/auth/trial', { headers: { Cookie: cookie } });
    expect(await trialResponse.json()).toMatchObject({
      state: 'free',
      billingEnabled: false,
      daysRemaining: 0,
      hasAiAccess: true,
    });

    const meResponse = await app.request('/api/auth/me', { headers: { Cookie: cookie } });
    expect(await meResponse.json()).toMatchObject({
      authenticated: true,
      userId: 'github:alice',
      trial: {
        state: 'free',
        billingEnabled: false,
        hasAiAccess: true,
      },
    });
    expect(container.userTrialRepo.findByUserId('github:alice')).toBeUndefined();
  });

  it('preserves the existing trial flow when billing is explicitly enabled', async () => {
    const { app, container } = createTestApp({ billingEnabled: true });
    const cookie = createSessionCookie(container, 'github:alice');

    const response = await app.request('/api/auth/trial', { headers: { Cookie: cookie } });
    expect(await response.json()).toMatchObject({
      state: 'trial',
      billingEnabled: true,
      hasAiAccess: true,
    });
    expect(container.userTrialRepo.findByUserId('github:alice')).toBeDefined();
  });

  it('keeps GitHub and Google sign-in without enabling password auth', async () => {
    process.env.PLANNER_GITHUB_CLIENT_ID = 'github-client';
    process.env.PLANNER_GOOGLE_CLIENT_ID = 'google-client';
    const { app } = createTestApp();

    const response = await app.request('/api/auth/providers');
    expect(await response.json()).toEqual({ providers: ['github', 'google'] });
  });
});

function createSessionCookie(container: ApiContainer, userId: string): string {
  const session = container.sessionRepo.create({
    id: 'session-free-access',
    userId,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    createdAt: new Date().toISOString(),
  });
  return `session=${session.id}`;
}
