import { createApp, type McpConfig } from '@planner/api';
import { createCoreContainer, SessionRepository } from '@planner/core';
import { createTestDb, createTestSpace } from '../helpers/db';

const config: McpConfig = {
  enabled: true,
  resourceUrl: 'http://localhost:3000/mcp',
  allowedHosts: ['localhost'],
  allowedOrigins: ['localhost'],
};

function createAuthenticatedTokenApp() {
  vi.stubEnv('PLANNER_GITHUB_CLIENT_ID', 'test-client');
  const db = createTestDb();
  const spaceId = createTestSpace(db);
  const session = new SessionRepository(db).create({
    id: 'test-session',
    userId: 'github:alice',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    createdAt: new Date().toISOString(),
  });
  const otherSession = new SessionRepository(db).create({
    id: 'other-session',
    userId: 'github:bob',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    createdAt: new Date().toISOString(),
  });
  const { app } = createApp({ db, mcpConfig: config });
  return {
    app,
    container: createCoreContainer(db, spaceId),
    spaceId,
    headers: { Cookie: `session=${session.id}` },
    otherHeaders: { Cookie: `session=${otherSession.id}` },
  };
}

describe('MCP token management API', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('creates, lists, and revokes a scoped grant without returning its secret again', async () => {
    const { app, container, spaceId, headers, otherHeaders } = createAuthenticatedTokenApp();

    const createResponse = await app.request('/api/mcp/tokens', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Claude Desktop',
        spaceId,
        scopes: ['planner:read'],
        expiresInDays: 30,
      }),
    });
    expect(createResponse.status).toBe(201);
    const created = await createResponse.json() as {
      token: string;
      grant: { id: string; scopes: string[]; spaceId: string };
      resourceUrl: string;
    };
    expect(created.token).toMatch(/^pln_mcp_/);
    expect(created.grant.scopes).toEqual(['planner:read']);
    expect(created.grant.spaceId).toBe(spaceId);
    expect(created.resourceUrl).toBe(config.resourceUrl);

    const listResponse = await app.request(`/api/mcp/tokens?spaceId=${spaceId}`, { headers });
    expect(listResponse.status).toBe(200);
    const listed = await listResponse.json() as {
      tokens: Array<Record<string, unknown>>;
      resourceUrl: string;
    };
    expect(listed.tokens).toHaveLength(1);
    expect(listed.tokens[0]).not.toHaveProperty('token');
    expect(listed.tokens[0]).not.toHaveProperty('tokenHash');

    const otherListResponse = await app.request(`/api/mcp/tokens?spaceId=${spaceId}`, {
      headers: otherHeaders,
    });
    expect(otherListResponse.status).toBe(200);
    const otherList = await otherListResponse.json() as { tokens: unknown[] };
    expect(otherList.tokens).toHaveLength(0);

    const otherRevokeResponse = await app.request(`/api/mcp/tokens/${created.grant.id}`, {
      method: 'DELETE',
      headers: otherHeaders,
    });
    expect(otherRevokeResponse.status).toBe(404);
    expect(container.mcpTokenService.verify(created.token, config.resourceUrl)).toBeDefined();

    const revokeResponse = await app.request(`/api/mcp/tokens/${created.grant.id}`, {
      method: 'DELETE',
      headers,
    });
    expect(revokeResponse.status).toBe(200);
    expect(container.mcpTokenService.verify(created.token, config.resourceUrl)).toBeUndefined();
  });

  it('validates requested scopes and expiry', async () => {
    const { app, spaceId, headers } = createAuthenticatedTokenApp();

    const response = await app.request('/api/mcp/tokens', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Overbroad agent',
        spaceId,
        scopes: ['planner:admin'],
        expiresInDays: 365,
      }),
    });

    expect(response.status).toBe(400);
  });
});
