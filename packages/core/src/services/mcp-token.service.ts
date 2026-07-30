import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { McpToken } from '../db/schema.js';
import { McpTokenRepository } from '../repositories/mcp-token.repository.js';
import { SpaceRepository } from '../repositories/space.repository.js';
import { NotFoundError, ValidationError } from '../errors.js';

export const MCP_SCOPES = ['planner:read', 'planner:write'] as const;
export type McpScope = typeof MCP_SCOPES[number];

const TOKEN_PREFIX = 'pln_mcp_';
const MAX_EXPIRY_DAYS = 90;
const LAST_USED_WRITE_INTERVAL_MS = 5 * 60 * 1000;

export interface CreateMcpTokenInput {
  name: string;
  userId: string;
  spaceId: string;
  scopes: McpScope[];
  resource: string;
  expiresInDays: number;
}

export interface CreatedMcpToken {
  token: string;
  grant: McpToken;
}

export class McpTokenService {
  constructor(
    private tokenRepo: McpTokenRepository,
    private spaceRepo: SpaceRepository,
  ) {}

  create(input: CreateMcpTokenInput, now: Date = new Date()): CreatedMcpToken {
    const name = input.name.trim();
    if (name.length < 1 || name.length > 80) {
      throw new ValidationError('Connection name must be 1-80 characters');
    }
    if (!input.userId) {
      throw new ValidationError('User ID is required');
    }
    if (!this.spaceRepo.findById(input.spaceId)) {
      throw new NotFoundError('Space', input.spaceId);
    }

    const scopes = [...new Set(input.scopes)];
    if (scopes.length === 0 || scopes.some(scope => !MCP_SCOPES.includes(scope))) {
      throw new ValidationError(`Scopes must include at least one of: ${MCP_SCOPES.join(', ')}`);
    }
    if (!Number.isInteger(input.expiresInDays) || input.expiresInDays < 1 || input.expiresInDays > MAX_EXPIRY_DAYS) {
      throw new ValidationError(`Token expiry must be 1-${MAX_EXPIRY_DAYS} days`);
    }

    validateResource(input.resource);

    let id = randomBytes(9).toString('base64url');
    while (this.tokenRepo.findById(id)) {
      id = randomBytes(9).toString('base64url');
    }

    const secret = randomBytes(32).toString('base64url');
    const token = `${TOKEN_PREFIX}${id}.${secret}`;
    const createdAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    const grant = this.tokenRepo.create({
      id,
      tokenHash: hashToken(token),
      name,
      userId: input.userId,
      spaceId: input.spaceId,
      scopes: JSON.stringify(scopes),
      resource: input.resource,
      expiresAt,
      createdAt,
    });

    return { token, grant };
  }

  list(userId: string, spaceId?: string): McpToken[] {
    return this.tokenRepo.findByUserId(userId, spaceId);
  }

  revoke(id: string, userId: string, now: Date = new Date()): boolean {
    return this.tokenRepo.revoke(id, userId, now.toISOString());
  }

  verify(token: string, expectedResource: string, now: Date = new Date()): McpToken | undefined {
    const match = token.match(/^pln_mcp_([A-Za-z0-9_-]{12})\.([A-Za-z0-9_-]{43})$/);
    if (!match) return undefined;

    const grant = this.tokenRepo.findById(match[1]);
    if (!grant || grant.revokedAt || grant.expiresAt <= now.toISOString() || grant.resource !== expectedResource) {
      return undefined;
    }

    const expectedHash = Buffer.from(grant.tokenHash, 'hex');
    const actualHash = Buffer.from(hashToken(token), 'hex');
    if (expectedHash.length !== actualHash.length || !timingSafeEqual(expectedHash, actualHash)) {
      return undefined;
    }

    const lastUsedAt = grant.lastUsedAt ? new Date(grant.lastUsedAt).getTime() : 0;
    if (now.getTime() - lastUsedAt >= LAST_USED_WRITE_INTERVAL_MS) {
      this.tokenRepo.updateLastUsedAt(grant.id, now.toISOString());
    }

    return grant;
  }

  parseScopes(grant: McpToken): McpScope[] {
    try {
      const parsed: unknown = JSON.parse(grant.scopes);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((scope): scope is McpScope =>
        typeof scope === 'string' && MCP_SCOPES.includes(scope as McpScope));
    } catch {
      return [];
    }
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function validateResource(value: string): void {
  let resource: URL;
  try {
    resource = new URL(value);
  } catch {
    throw new ValidationError('MCP resource URL must be an absolute URL');
  }

  const localHttp = resource.protocol === 'http:'
    && ['localhost', '127.0.0.1', '[::1]'].includes(resource.hostname);
  if (resource.protocol !== 'https:' && !localHttp) {
    throw new ValidationError('MCP resource URL must use HTTPS (HTTP is allowed only on localhost)');
  }
  if (resource.username || resource.password || resource.search || resource.hash) {
    throw new ValidationError('MCP resource URL cannot contain credentials, a query, or a fragment');
  }
}
