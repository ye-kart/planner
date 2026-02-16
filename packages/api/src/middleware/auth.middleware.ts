import type { Context, Next } from 'hono';
import type { ApiContainer } from '../container.js';

export function createAuthMiddleware(container: ApiContainer) {
  return async (c: Context, next: Next) => {
    const sessionId = getCookie(c, 'session');
    if (!sessionId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const session = container.sessionRepo.findById(sessionId);
    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (new Date(session.expiresAt) < new Date()) {
      container.sessionRepo.delete(sessionId);
      return c.json({ error: 'Session expired' }, 401);
    }

    c.set('userId', session.userId);
    c.set('sessionId', session.id);
    await next();
  };
}

function getCookie(c: Context, name: string): string | undefined {
  const header = c.req.header('cookie');
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : undefined;
}
