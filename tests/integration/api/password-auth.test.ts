import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from './helpers';

const originalFetch = globalThis.fetch;

afterEach(() => {
  delete process.env.PLANNER_RESEND_API_KEY;
  delete process.env.PLANNER_EMAIL_FROM;
  globalThis.fetch = originalFetch;
});

describe('email/password authentication', () => {
  it('registers, verifies, and signs in a user', async () => {
    process.env.PLANNER_RESEND_API_KEY = 'test-key';
    process.env.PLANNER_EMAIL_FROM = 'Planner <accounts@example.com>';
    let sentHtml = '';
    globalThis.fetch = vi.fn(async (_input, init) => {
      sentHtml = JSON.parse(String(init?.body)).html;
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
    const { app, container } = createTestApp();

    const registration = await app.request('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'User@example.com', password: 'a secure password' }) });
    expect(registration.status).toBe(201);
    expect(container.passwordCredentialRepo.findByEmail('user@example.com')?.verifiedAt).toBeNull();

    const token = new URL(sentHtml.match(/href="([^"]+)"/)?.[1] ?? '').searchParams.get('token');
    expect(token).toBeTruthy();
    const verification = await app.request(`/api/auth/verify?token=${encodeURIComponent(token!)}`);
    expect(verification.status).toBe(302);

    const login = await app.request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'USER@example.com', password: 'a secure password' }) });
    expect(login.status).toBe(200);
    expect(login.headers.get('set-cookie')).toContain('session=');
  });

  it('rejects weak passwords and unverified password logins', async () => {
    process.env.PLANNER_RESEND_API_KEY = 'test-key';
    process.env.PLANNER_EMAIL_FROM = 'Planner <accounts@example.com>';
    globalThis.fetch = vi.fn(async () => new Response('{}', { status: 200 })) as typeof fetch;
    const { app } = createTestApp();
    const weak = await app.request('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'user@example.com', password: 'short' }) });
    expect(weak.status).toBe(400);
    const register = await app.request('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'user@example.com', password: 'a secure password' }) });
    expect(register.status).toBe(201);
    const login = await app.request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'user@example.com', password: 'a secure password' }) });
    expect(login.status).toBe(403);
  });
});
