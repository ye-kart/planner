import { Hono } from 'hono';
import { generateId } from '@planner/core';
import type { ApiContainer } from '../container.js';

export function createAuthRoutes(container: ApiContainer): Hono {
  const app = new Hono();
  const { sessionRepo } = container;

  const clientId = process.env.PLANNER_GITHUB_CLIENT_ID;
  const clientSecret = process.env.PLANNER_GITHUB_CLIENT_SECRET;
  const allowedUsers = (process.env.PLANNER_ALLOWED_GITHUB_USERS ?? '').split(',').map(u => u.trim()).filter(Boolean);

  app.get('/github', (c) => {
    if (!clientId) {
      return c.json({ error: 'GitHub OAuth not configured' }, 503);
    }
    const redirectUri = new URL('/api/auth/github/callback', c.req.url).toString();
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user`;
    return c.redirect(url);
  });

  app.get('/github/callback', async (c) => {
    const code = c.req.query('code');
    if (!code || !clientId || !clientSecret) {
      return c.json({ error: 'Invalid OAuth callback' }, 400);
    }

    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
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
    const session = sessionRepo.create({
      id: generateId() + generateId(),
      userId: user.login,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Set cookie and redirect to app
    c.header('Set-Cookie', `session=${session.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`);
    return c.redirect('/');
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

function getCookie(c: { req: { header: (name: string) => string | undefined } }, name: string): string | undefined {
  const header = c.req.header('cookie');
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : undefined;
}
