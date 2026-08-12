import { Hono } from 'hono';
import { generateId, normalizeUsername } from '@planner/core';
import type { ApiContainer } from '../container.js';
import { createToken, hashPassword, hashToken, isValidEmail, normalizeEmail, sendResendEmail, validatePassword, verifyPassword } from '../services/password-auth.js';
import {
  createAnonymousAccessStatus,
  createBillingAccessStatus,
  createFreeAccessStatus,
  getBillingConfig,
  type BillingConfig,
} from '../config/billing.js';

export function createAuthRoutes(
  container: ApiContainer,
  billingConfig: BillingConfig = getBillingConfig(),
): Hono {
  const app = new Hono();
  const { sessionRepo, passwordCredentialRepo, emailTokenRepo, allowedUserRepo, trialService } = container;

  const githubClientId = process.env.PLANNER_GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.PLANNER_GITHUB_CLIENT_SECRET;

  const googleClientId = process.env.PLANNER_GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.PLANNER_GOOGLE_CLIENT_SECRET;
  const emailAuthConfigured = Boolean(process.env.PLANNER_RESEND_API_KEY && process.env.PLANNER_EMAIL_FROM);

  app.post('/register', async (c) => {
    if (!emailAuthConfigured) return c.json({ error: 'Email/password sign-in is not configured' }, 503);
    const body = await c.req.json<{ email?: string; password?: string }>();
    const email = normalizeEmail(body.email ?? '');
    const password = body.password ?? '';
    const passwordError = validatePassword(password);
    if (!isValidEmail(email) || passwordError) return c.json({ error: passwordError ?? 'Enter a valid email address' }, 400);
    if (passwordCredentialRepo.findByEmail(email)) return c.json({ error: 'An account with that email already exists' }, 409);
    const now = new Date().toISOString();
    passwordCredentialRepo.create({ email, passwordHash: hashPassword(password), createdAt: now, updatedAt: now });
    const token = createToken();
    emailTokenRepo.create({ id: generateId() + generateId(), email, tokenHash: hashToken(token), purpose: 'verify_email', expiresAt: new Date(Date.now() + 86_400_000).toISOString(), createdAt: now });
    const verificationUrl = new URL(`/api/auth/verify?token=${encodeURIComponent(token)}`, getBaseUrl(c)).toString();
    if (!await sendResendEmail({ to: email, subject: 'Verify your Planner email', html: `<p>Welcome to Planner.</p><p><a href="${verificationUrl}">Verify your email address</a></p><p>This link expires in 24 hours.</p>` })) return c.json({ error: 'Unable to send verification email' }, 502);
    return c.json({ ok: true }, 201);
  });

  app.get('/verify', (c) => {
    const token = c.req.query('token');
    if (!token) return c.json({ error: 'Invalid verification link' }, 400);
    const record = emailTokenRepo.findUnused(hashToken(token), 'verify_email');
    if (!record || new Date(record.expiresAt) < new Date()) return c.json({ error: 'Verification link is invalid or expired' }, 400);
    const now = new Date().toISOString();
    passwordCredentialRepo.markVerified(record.email, now);
    emailTokenRepo.markUsed(record.id, now);
    return c.redirect('/login?verified=1');
  });

  app.post('/login', async (c) => {
    const body = await c.req.json<{ email?: string; password?: string }>();
    const email = normalizeEmail(body.email ?? '');
    const credential = passwordCredentialRepo.findByEmail(email);
    if (!credential || !verifyPassword(body.password ?? '', credential.passwordHash)) return c.json({ error: 'Email or password is incorrect' }, 401);
    if (!credential.verifiedAt) return c.json({ error: 'Verify your email before signing in' }, 403);
    const session = createSession(sessionRepo, `email:${email}`);
    setSessionCookie(c, session.id);
    if (billingConfig.enabled) trialService.ensureTrial(`email:${email}`);
    return c.json({ ok: true });
  });

  app.post('/password-reset', async (c) => {
    if (!emailAuthConfigured) return c.json({ error: 'Email/password sign-in is not configured' }, 503);
    const body = await c.req.json<{ email?: string }>();
    const email = normalizeEmail(body.email ?? '');
    const credential = passwordCredentialRepo.findByEmail(email);
    if (credential?.verifiedAt) {
      const now = new Date().toISOString();
      const token = createToken();
      emailTokenRepo.create({ id: generateId() + generateId(), email, tokenHash: hashToken(token), purpose: 'reset_password', expiresAt: new Date(Date.now() + 3_600_000).toISOString(), createdAt: now });
      const resetUrl = new URL(`/login?resetToken=${encodeURIComponent(token)}`, getBaseUrl(c)).toString();
      await sendResendEmail({ to: email, subject: 'Reset your Planner password', html: `<p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in one hour.</p>` });
    }
    return c.json({ ok: true });
  });

  app.post('/password-reset/confirm', async (c) => {
    const body = await c.req.json<{ token?: string; password?: string }>();
    const password = body.password ?? '';
    const passwordError = validatePassword(password);
    if (!body.token || passwordError) return c.json({ error: passwordError ?? 'Invalid reset link' }, 400);
    const record = emailTokenRepo.findUnused(hashToken(body.token), 'reset_password');
    if (!record || new Date(record.expiresAt) < new Date()) return c.json({ error: 'Reset link is invalid or expired' }, 400);
    const now = new Date().toISOString();
    passwordCredentialRepo.updatePassword(record.email, hashPassword(password), now);
    emailTokenRepo.markUsed(record.id, now);
    return c.json({ ok: true });
  });

  // --- GitHub OAuth ---

  app.get('/github', (c) => {
    if (!githubClientId) {
      return c.json({ error: 'GitHub OAuth not configured' }, 503);
    }
    const redirectUri = new URL('/api/auth/github/callback', getBaseUrl(c)).toString();
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

    const login = normalizeUsername(user.login);

    // Check allowlist (database)
    if (!allowedUserRepo.isAllowed('github', login)) {
      return c.json({ error: 'User not authorized' }, 403);
    }

    const userId = `github:${login}`;
    if (billingConfig.enabled) trialService.ensureTrial(userId);

    // Create session
    const session = createSession(sessionRepo, userId);
    const secure = c.req.header('x-forwarded-proto') === 'https' ? '; Secure' : '';
    c.header('Set-Cookie', `session=${session.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${secure}`);
    return c.redirect('/');
  });

  // --- Google OAuth ---

  app.get('/google', (c) => {
    if (!googleClientId) {
      return c.json({ error: 'Google OAuth not configured' }, 503);
    }
    const redirectUri = new URL('/api/auth/google/callback', getBaseUrl(c)).toString();
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

    const redirectUri = new URL('/api/auth/google/callback', getBaseUrl(c)).toString();

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

    const email = normalizeUsername(user.email);

    // Check allowlist (database)
    if (!allowedUserRepo.isAllowed('google', email)) {
      return c.json({ error: 'User not authorized' }, 403);
    }

    const userId = `google:${email}`;
    if (billingConfig.enabled) trialService.ensureTrial(userId);

    // Create session
    const session = createSession(sessionRepo, userId);
    const secure = c.req.header('x-forwarded-proto') === 'https' ? '; Secure' : '';
    c.header('Set-Cookie', `session=${session.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${secure}`);
    return c.redirect('/');
  });

  // --- Common endpoints ---

  app.get('/providers', (c) => {
    const providers: string[] = [];
    if (githubClientId) providers.push('github');
    if (googleClientId) providers.push('google');
    if (emailAuthConfigured) providers.push('password');
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
    const [provider, username] = session.userId.split(':');
    const isAdmin = provider && username ? allowedUserRepo.isAdmin(provider, normalizeUsername(username)) : false;

    const trial = billingConfig.enabled
      ? (() => {
          // Self-heal when billing is enabled and a legacy session pre-dates the trial table.
          trialService.ensureTrial(session.userId);
          return createBillingAccessStatus(trialService.getStatus(session.userId));
        })()
      : createFreeAccessStatus();

    return c.json({ authenticated: true, userId: session.userId, isAdmin, trial });
  });

  app.get('/trial', (c) => {
    // Degrade gracefully like /me: with no/expired session (e.g. OAuth not
    // configured) return a 200 sentinel instead of 401. A 401 here would trip
    // the web client's global "401 -> /login" redirect and brick the SPA, even
    // though all data routes are open when auth is disabled.
    const sessionId = getCookie(c, 'session');
    const session = sessionId ? sessionRepo.findById(sessionId) : undefined;
    if (!session || new Date(session.expiresAt) < new Date()) {
      return c.json(createAnonymousAccessStatus(billingConfig));
    }
    if (!billingConfig.enabled) return c.json(createFreeAccessStatus());

    trialService.ensureTrial(session.userId);
    return c.json(createBillingAccessStatus(trialService.getStatus(session.userId)));
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

function setSessionCookie(c: { req: { header: (name: string) => string | undefined }; header: (name: string, value: string) => void }, sessionId: string): void {
  const secure = c.req.header('x-forwarded-proto') === 'https' ? '; Secure' : '';
  c.header('Set-Cookie', `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${secure}`);
}

function getBaseUrl(c: { req: { header: (name: string) => string | undefined; url: string } }): string {
  const proto = c.req.header('x-forwarded-proto') || 'http';
  const host = c.req.header('host') || 'localhost';
  return `${proto}://${host}`;
}

function getCookie(c: { req: { header: (name: string) => string | undefined } }, name: string): string | undefined {
  const header = c.req.header('cookie');
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : undefined;
}
