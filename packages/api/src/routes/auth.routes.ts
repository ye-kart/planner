import { Hono } from 'hono';
import { generateId } from '@planner/core';
import type { ApiContainer } from '../container.js';

export function createAuthRoutes(container: ApiContainer): Hono {
  const app = new Hono();
  const { sessionRepo } = container;

  const githubClientId = process.env.PLANNER_GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.PLANNER_GITHUB_CLIENT_SECRET;
  const allowedUsers = (process.env.PLANNER_ALLOWED_GITHUB_USERS ?? '').split(',').map(u => u.trim()).filter(Boolean);

  const googleClientId = process.env.PLANNER_GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.PLANNER_GOOGLE_CLIENT_SECRET;
  const allowedEmails = (process.env.PLANNER_ALLOWED_GOOGLE_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean);

  // --- GitHub OAuth ---

  app.get('/github', (c) => {
    if (!githubClientId) {
      return c.json({ error: 'GitHub OAuth not configured' }, 503);
    }
    const redirectUri = new URL('/api/auth/github/callback', c.req.url).toString();
    const url = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user`;
    return c.redirect(url);
  });

  app.get('/github/callback', async (c) => {
    const code = c.req.query('code');
    if (!code || !githubClientId || !githubClientSecret) {
      return c.json({ error: 'Invalid OAuth callback' }, 400);
    }

    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: githubClientId, client_secret: githubClientSecret, code }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };

    if (!tokenData.access_token) {
      return c.json({ error: 'Failed to get access token' }, 400);
    }

    // Get user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json() as { login?: string; id?: number };

    if (!user.login) {
      return c.json({ error: 'Failed to get user info' }, 400);
    }

    // Check allowlist
    if (allowedUsers.length > 0 && !allowedUsers.includes(user.login)) {
      return c.json({ error: 'User not authorized' }, 403);
    }

    // Create session
    const session = createSession(sessionRepo, `github:${user.login}`);
    c.header('Set-Cookie', `session=${session.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`);
    return c.redirect('/');
  });

  // --- Google OAuth ---

  app.get('/google', (c) => {
    if (!googleClientId) {
      return c.json({ error: 'Google OAuth not configured' }, 503);
    }
    const redirectUri = new URL('/api/auth/google/callback', c.req.url).toString();
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });
    return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  app.get('/google/callback', async (c) => {
    const code = c.req.query('code');
    if (!code || !googleClientId || !googleClientSecret) {
      return c.json({ error: 'Invalid OAuth callback' }, 400);
    }

    const redirectUri = new URL('/api/auth/google/callback', c.req.url).toString();

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };

    if (!tokenData.access_token) {
      return c.json({ error: 'Failed to get access token' }, 400);
    }

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json() as { email?: string; name?: string };

    if (!user.email) {
      return c.json({ error: 'Failed to get user info' }, 400);
    }

    // Check allowlist
    if (allowedEmails.length > 0 && !allowedEmails.includes(user.email)) {
      return c.json({ error: 'User not authorized' }, 403);
    }

    // Create session
    const session = createSession(sessionRepo, `google:${user.email}`);
    c.header('Set-Cookie', `session=${session.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`);
    return c.redirect('/');
  });

  // --- Common endpoints ---

  app.get('/providers', (c) => {
    const providers: string[] = [];
    if (githubClientId) providers.push('github');
    if (googleClientId) providers.push('google');
    return c.json({ providers });
  });

  app.post('/logout', (c) => {
    const sessionId = getCookie(c, 'session');
    if (sessionId) {
      sessionRepo.delete(sessionId);
    }
    c.header('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0');
    return c.json({ ok: true });
  });

  app.get('/me', (c) => {
    const sessionId = getCookie(c, 'session');
    if (!sessionId) return c.json({ authenticated: false });
    const session = sessionRepo.findById(sessionId);
    if (!session || new Date(session.expiresAt) < new Date()) {
      return c.json({ authenticated: false });
    }
    return c.json({ authenticated: true, userId: session.userId });
  });

  return app;
}

function createSession(sessionRepo: ApiContainer['sessionRepo'], userId: string) {
  return sessionRepo.create({
    id: generateId() + generateId(),
    userId,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  });
}

function getCookie(c: { req: { header: (name: string) => string | undefined } }, name: string): string | undefined {
  const header = c.req.header('cookie');
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : undefined;
}
