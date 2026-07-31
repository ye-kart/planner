import { createMcpHandler, McpServer, OAuthError, OAuthErrorCode, requireBearerAuth, type AuthInfo } from '@modelcontextprotocol/server';
import { createMcpHonoApp, hostHeaderValidation, originValidation } from '@modelcontextprotocol/hono';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import {
  AllowedUserRepository,
  McpTokenRepository,
  McpTokenService,
  SpaceRepository,
  createCoreContainer,
  normalizeUsername,
  type DB,
  type McpScope,
} from '@planner/core';
import type { McpConfig } from './config.js';
import { registerPlannerTools } from './tools.js';

const MAX_MCP_REQUEST_BYTES = 256 * 1024;
type McpEnvironment = { Variables: { mcpAuthInfo: AuthInfo } };

export function createPlannerMcpApp(db: DB, config: McpConfig) {
  const app = new Hono<McpEnvironment>();

  const tokenService = new McpTokenService(
    new McpTokenRepository(db),
    new SpaceRepository(db),
  );
  const allowedUserRepo = new AllowedUserRepository(db);

  const verifier = {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      const grant = tokenService.verify(token, config.resourceUrl);
      if (!grant || !isAllowedUser(allowedUserRepo, grant.userId)) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, 'The access token is invalid, expired, or revoked');
      }

      const scopes = tokenService.parseScopes(grant);
      if (scopes.length === 0) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, 'The access token has no supported scopes');
      }

      return {
        token,
        clientId: `planner-token:${grant.id}`,
        scopes,
        expiresAt: Math.floor(new Date(grant.expiresAt).getTime() / 1000),
        resource: new URL(grant.resource),
        extra: {
          tokenId: grant.id,
          userId: grant.userId,
          spaceId: grant.spaceId,
        },
      };
    },
  };

  const requireToken = requireBearerAuth({ verifier });
  app.use('*', hostHeaderValidation(config.allowedHosts));
  app.use('*', originValidation(config.allowedOrigins));
  app.use('*', async (c, next) => {
    if (!config.enabled) {
      return c.json({ error: config.disabledReason ?? 'MCP is not configured' }, 503);
    }

    const authenticated = await requireToken(c.req.raw);
    if (authenticated instanceof Response) return authenticated;
    c.set('mcpAuthInfo', authenticated);
    await next();
  });
  app.use('*', bodyLimit({
    maxSize: MAX_MCP_REQUEST_BYTES,
    onError: c => c.json({
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: 'MCP request body exceeds the 256 KiB limit',
      },
      id: null,
    }, 413),
  }));

  // The official adapter remains the isolated transport layer. The outer app
  // authenticates and caps requests before the adapter parses JSON.
  const transport = createMcpHonoApp({
    host: '0.0.0.0',
    allowedHosts: config.allowedHosts,
    allowedOrigins: config.allowedOrigins,
  });
  const handler = createMcpHandler(({ authInfo }) => {
    const spaceId = authInfo?.extra?.spaceId;
    if (typeof spaceId !== 'string') {
      throw new Error('Authenticated MCP request is missing its space scope');
    }

    const server = new McpServer({
      name: 'planner',
      version: '0.1.0',
    });
    registerPlannerTools(server, createCoreContainer(db, spaceId), (authInfo?.scopes ?? []) as McpScope[]);
    return server;
  });

  transport.all('/', async (c) => {
    const authenticated = (c as unknown as {
      get: (key: 'mcpAuthInfo') => AuthInfo;
    }).get('mcpAuthInfo');
    const parsedBody = (c as unknown as { get: (key: 'parsedBody') => unknown }).get('parsedBody');
    return handler.fetch(c.req.raw, {
      parsedBody,
      authInfo: authenticated,
    });
  });

  app.route('/', transport);
  return app;
}

function isAllowedUser(repo: AllowedUserRepository, userId: string): boolean {
  const separator = userId.indexOf(':');
  if (separator <= 0) return false;
  const provider = userId.slice(0, separator);
  const username = normalizeUsername(userId.slice(separator + 1));
  return repo.isAllowed(provider, username);
}
