import { Hono, type Context } from 'hono';
import { z } from 'zod/v4';
import { MCP_SCOPES, normalizeUsername, type McpScope } from '@planner/core';
import type { ApiContainer } from '../container.js';
import type { McpConfig } from '../mcp/config.js';

const CreateTokenSchema = z.object({
  name: z.string().trim().min(1).max(80),
  spaceId: z.string().min(1).max(100),
  scopes: z.array(z.enum(MCP_SCOPES)).min(1).max(MCP_SCOPES.length),
  expiresInDays: z.number().int().min(1).max(90),
}).strict();

export function createMcpTokenRoutes(container: ApiContainer, config: McpConfig): Hono {
  const app = new Hono();

  app.use('*', async (c, next) => {
    if (!config.enabled) {
      return c.json({ error: config.disabledReason ?? 'MCP is not configured' }, 503);
    }

    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'Sign in to manage agent access' }, 401);
    if (!isAllowedUser(container, userId)) {
      return c.json({ error: 'User is no longer authorized' }, 403);
    }

    await next();
  });

  app.get('/tokens', (c) => {
    const userId = getUserId(c)!;
    const spaceId = c.req.query('spaceId');
    if (spaceId) container.spaceService.show(spaceId);

    const tokens = container.mcpTokenService
      .list(userId, spaceId)
      .map(grant => serializeGrant(container, grant));
    return c.json({ tokens, resourceUrl: config.resourceUrl });
  });

  app.post('/tokens', async (c) => {
    const parsed = CreateTokenSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!parsed.success) {
      return c.json({ error: 'Invalid connection settings', details: parsed.error.flatten() }, 400);
    }

    const userId = getUserId(c)!;
    const created = container.mcpTokenService.create({
      ...parsed.data,
      scopes: [...new Set(parsed.data.scopes)] as McpScope[],
      userId,
      resource: config.resourceUrl,
    });

    return c.json({
      token: created.token,
      grant: serializeGrant(container, created.grant),
      resourceUrl: config.resourceUrl,
    }, 201);
  });

  app.delete('/tokens/:id', (c) => {
    const userId = getUserId(c)!;
    const revoked = container.mcpTokenService.revoke(c.req.param('id'), userId);
    if (!revoked) return c.json({ error: 'Connection not found' }, 404);
    return c.json({ ok: true });
  });

  return app;
}

function getUserId(c: Context): string | undefined {
  return c.get('userId' as never) as string | undefined;
}

function isAllowedUser(container: ApiContainer, userId: string): boolean {
  const separator = userId.indexOf(':');
  if (separator <= 0) return false;
  const provider = userId.slice(0, separator);
  const username = normalizeUsername(userId.slice(separator + 1));
  return container.allowedUserRepo.isAllowed(provider, username);
}

function serializeGrant(container: ApiContainer, grant: ReturnType<ApiContainer['mcpTokenService']['list']>[number]) {
  return {
    id: grant.id,
    name: grant.name,
    userId: grant.userId,
    spaceId: grant.spaceId,
    scopes: container.mcpTokenService.parseScopes(grant),
    resource: grant.resource,
    expiresAt: grant.expiresAt,
    lastUsedAt: grant.lastUsedAt,
    revokedAt: grant.revokedAt,
    createdAt: grant.createdAt,
  };
}
