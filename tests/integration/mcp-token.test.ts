import { createCoreContainer } from '@planner/core';
import { createTestDb, createTestSpace } from './helpers/db';

describe('MCP token service', () => {
  it('issues only a hashed, space-bound grant and verifies the raw token', () => {
    const db = createTestDb();
    const spaceId = createTestSpace(db);
    const service = createCoreContainer(db, spaceId).mcpTokenService;
    const now = new Date('2026-07-30T10:00:00.000Z');

    const created = service.create({
      name: 'Desktop agent',
      userId: 'github:alice',
      spaceId,
      scopes: ['planner:read'],
      resource: 'https://planner.example/mcp',
      expiresInDays: 30,
    }, now);

    expect(created.token).toMatch(/^pln_mcp_[A-Za-z0-9_-]{12}\.[A-Za-z0-9_-]{43}$/);
    expect(created.grant.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(created.grant.tokenHash).not.toContain(created.token);
    expect(created.grant.spaceId).toBe(spaceId);
    expect(service.parseScopes(created.grant)).toEqual(['planner:read']);

    const verified = service.verify(
      created.token,
      'https://planner.example/mcp',
      new Date('2026-07-30T10:01:00.000Z'),
    );
    expect(verified?.id).toBe(created.grant.id);
    expect(service.verify(created.token, 'https://other.example/mcp', now)).toBeUndefined();
    expect(service.verify(`${created.token}x`, 'https://planner.example/mcp', now)).toBeUndefined();
  });

  it('supports owner-only revocation and rejects expired or revoked grants', () => {
    const db = createTestDb();
    const spaceId = createTestSpace(db);
    const service = createCoreContainer(db, spaceId).mcpTokenService;
    const createdAt = new Date('2026-07-30T10:00:00.000Z');
    const created = service.create({
      name: 'Temporary agent',
      userId: 'google:alice@example.com',
      spaceId,
      scopes: ['planner:read', 'planner:write'],
      resource: 'http://localhost:3000/mcp',
      expiresInDays: 1,
    }, createdAt);

    expect(service.revoke(created.grant.id, 'github:someone-else', createdAt)).toBe(false);
    expect(service.verify(
      created.token,
      'http://localhost:3000/mcp',
      new Date('2026-07-31T10:00:01.000Z'),
    )).toBeUndefined();

    expect(service.revoke(created.grant.id, 'google:alice@example.com', createdAt)).toBe(true);
    expect(service.verify(created.token, 'http://localhost:3000/mcp', createdAt)).toBeUndefined();
  });
});
