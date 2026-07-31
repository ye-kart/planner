import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createCoreContainer, SpaceRepository, generateId } from '@planner/core';
import { createApp, type McpConfig } from '@planner/api';
import { createTestApp } from './helpers';

const config: McpConfig = {
  enabled: true,
  resourceUrl: 'http://localhost:3000/mcp',
  allowedHosts: ['localhost'],
  allowedOrigins: ['localhost'],
};

describe('Planner MCP endpoint', () => {
  it('requires a bearer token and rejects an untrusted browser origin', async () => {
    const { app } = createTestAppWithMcp();

    const unauthenticated = await mcpPost(app, '', initializeRequest());
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.headers.get('www-authenticate')).toContain('Bearer');

    const invalidOrigin = await mcpPost(app, 'not-a-real-token', initializeRequest(), {
      Origin: 'https://evil.example',
    });
    expect(invalidOrigin.status).toBe(403);

    const invalidHost = await mcpPost(app, 'not-a-real-token', initializeRequest(), {
      Host: 'evil.example',
    });
    expect(invalidHost.status).toBe(403);
  });

  it('authenticates before parsing and caps authenticated request bodies', async () => {
    const { app, readToken } = createTestAppWithMcp();
    const malformed = await app.request('/mcp', {
      method: 'POST',
      headers: {
        Host: 'localhost',
        'Content-Type': 'application/json',
      },
      body: '{"unfinished":',
    });
    expect(malformed.status).toBe(401);

    const oversizedBody = JSON.stringify({ padding: 'x'.repeat(300 * 1024) });
    const oversized = await app.request('/mcp', {
      method: 'POST',
      headers: {
        Host: 'localhost',
        Authorization: `Bearer ${readToken}`,
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(oversizedBody)),
      },
      body: oversizedBody,
    });
    expect(oversized.status).toBe(413);
  });

  it('advertises only tools allowed by the grant scope', async () => {
    const { app, readToken, writeToken } = createTestAppWithMcp();

    const readTools = await withClient(app, readToken, async client => {
      const result = await client.listTools();
      return result.tools.map(tool => tool.name);
    });
    expect(readTools).toContain('list_tasks');
    expect(readTools).toContain('get_today');
    expect(readTools).not.toContain('create_task');

    const writeTools = await withClient(app, writeToken, async client => {
      const result = await client.listTools();
      return result.tools.map(tool => tool.name);
    });
    expect(writeTools).toContain('create_task');
    expect(writeTools).toContain('set_habit_completion');
    expect(writeTools).not.toContain('list_tasks');
    expect(writeTools).not.toContain('delete_task');
  });

  it('rejects an existing grant when its user is removed from the app allowlist', async () => {
    const { app, container, readToken } = createTestAppWithMcp();
    const alice = container.allowedUserRepo.create({
      id: generateId(),
      provider: 'github',
      username: 'alice',
      isAdmin: false,
      createdAt: new Date().toISOString(),
    });
    container.allowedUserRepo.create({
      id: generateId(),
      provider: 'github',
      username: 'bob',
      isAdmin: false,
      createdAt: new Date().toISOString(),
    });

    expect((await mcpPost(app, readToken, initializeRequest())).status).toBe(200);
    container.allowedUserRepo.delete(alice.id);
    expect((await mcpPost(app, readToken, initializeRequest())).status).toBe(401);
  });

  it('keeps reads and writes inside the token-bound space', async () => {
    const { app, db, spaceId, readWriteToken } = createTestAppWithMcp();
    const otherSpace = new SpaceRepository(db).create({
      id: generateId(),
      name: 'Other Space',
      position: 1,
      createdAt: '2026-07-30',
    });
    const scoped = createCoreContainer(db, spaceId);
    const other = createCoreContainer(db, otherSpace.id);
    const scopedTask = scoped.taskService.add('Visible task');
    const scopedHabit = scoped.habitService.add('Visible habit');
    other.taskService.add('Private task in another space');
    const foreignArea = other.areaService.add('Private area');

    const listed = await withClient(app, readWriteToken, async client =>
      JSON.stringify(await client.callTool({ name: 'list_tasks', arguments: {} })));
    expect(listed).toContain('Visible task');
    expect(listed).not.toContain('Private task in another space');

    const created = await withClient(app, readWriteToken, async client =>
      JSON.stringify(await client.callTool({ name: 'create_task', arguments: { title: 'Created by agent' } })));
    expect(created).toContain('Created by agent');
    expect(scoped.taskService.list().map(task => task.title)).toContain('Created by agent');
    expect(other.taskService.list().map(task => task.title)).not.toContain('Created by agent');

    const rejectedLinks = await withClient(app, readWriteToken, async client => ({
      task: await client.callTool({
        name: 'update_task',
        arguments: { id: scopedTask.id, areaId: foreignArea.id },
      }),
      habit: await client.callTool({
        name: 'update_habit',
        arguments: { id: scopedHabit.id, areaId: foreignArea.id },
      }),
    }));
    expect(rejectedLinks.task.isError).toBe(true);
    expect(rejectedLinks.habit.isError).toBe(true);
    expect(scoped.taskService.show(scopedTask.id).areaId).toBeNull();
    expect(scoped.habitService.show(scopedHabit.id).areaId).toBeNull();
  });
});

function createTestAppWithMcp() {
  const { container, db, spaceId } = createTestApp();
  const readToken = container.mcpTokenService.create({
    name: 'Read client',
    userId: 'github:alice',
    spaceId,
    scopes: ['planner:read'],
    resource: config.resourceUrl,
    expiresInDays: 30,
  }).token;
  const writeToken = container.mcpTokenService.create({
    name: 'Write client',
    userId: 'github:alice',
    spaceId,
    scopes: ['planner:write'],
    resource: config.resourceUrl,
    expiresInDays: 30,
  }).token;
  const readWriteToken = container.mcpTokenService.create({
    name: 'Read-write client',
    userId: 'github:alice',
    spaceId,
    scopes: ['planner:read', 'planner:write'],
    resource: config.resourceUrl,
    expiresInDays: 30,
  }).token;
  const { app } = createApp({ container, db, mcpConfig: config });
  return { app, container, db, spaceId, readToken, writeToken, readWriteToken };
}

async function withClient<T>(
  app: ReturnType<typeof createTestAppWithMcp>['app'],
  token: string,
  run: (client: Client) => Promise<T>,
): Promise<T> {
  const transport = new StreamableHTTPClientTransport(new URL(config.resourceUrl), {
    authProvider: { token: async () => token },
    fetch: async (input, init) => {
      const request = new Request(input, init);
      const headers = new Headers(request.headers);
      headers.set('Host', 'localhost');
      return app.fetch(new Request(request, { headers }));
    },
  });
  const client = new Client({ name: 'planner-tests', version: '1.0.0' });
  await client.connect(transport);
  try {
    return await run(client);
  } finally {
    await client.close();
  }
}

function initializeRequest() {
  return {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'planner-tests', version: '1.0.0' },
    },
  };
}

function mcpPost(
  app: ReturnType<typeof createTestAppWithMcp>['app'],
  token: string,
  body: Record<string, unknown>,
  extraHeaders: Record<string, string> = {},
) {
  return app.request('/mcp', {
    method: 'POST',
    headers: {
      Host: 'localhost',
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}
