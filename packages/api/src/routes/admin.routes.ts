import { Hono, type Context } from 'hono';
import { generateId, normalizeUsername } from '@planner/core';
import type { ApiContainer } from '../container.js';

export function createAdminRoutes(container: ApiContainer): Hono {
  const app = new Hono();
  const { allowedUserRepo } = container;

  // Admin guard: check if logged-in user is admin
  app.use('*', async (c: Context, next) => {
    const userId = (c as any).get('userId') as string | undefined;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const [provider, username] = userId.split(':');
    if (!provider || !username || !allowedUserRepo.isAdmin(provider, normalizeUsername(username))) {
      return c.json({ error: 'Admin access required' }, 403);
    }
    await next();
  });

  // List allowed users
  app.get('/allowed-users', (c) => {
    const users = allowedUserRepo.findAll();
    return c.json(users);
  });

  // Add allowed user
  app.post('/allowed-users', async (c) => {
    const body = await c.req.json() as { provider?: string; username?: string };
    const provider = body.provider ?? 'github';
    const username = body.username ? normalizeUsername(body.username) : '';

    if (!username) {
      return c.json({ error: 'Username is required' }, 400);
    }
    if (provider !== 'github' && provider !== 'google') {
      return c.json({ error: 'Provider must be github or google' }, 400);
    }

    // Check for duplicates
    const existing = allowedUserRepo.findByProviderAndUsername(provider, username);
    if (existing) {
      return c.json({ error: 'User already in allowlist' }, 409);
    }

    const user = allowedUserRepo.create({
      id: generateId(),
      provider,
      username,
      isAdmin: false,
      createdAt: new Date().toISOString(),
    });

    return c.json(user, 201);
  });

  // Remove allowed user
  app.delete('/allowed-users/:id', (c) => {
    const id = c.req.param('id');
    const user = allowedUserRepo.findById(id);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    if (user.isAdmin) {
      return c.json({ error: 'Cannot remove admin user' }, 403);
    }

    allowedUserRepo.delete(id);
    return c.json({ ok: true });
  });

  return app;
}
