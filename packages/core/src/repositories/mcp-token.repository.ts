import { and, desc, eq } from 'drizzle-orm';
import { mcpTokens, type McpToken, type NewMcpToken } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class McpTokenRepository {
  constructor(private db: DB) {}

  findById(id: string): McpToken | undefined {
    return this.db.select().from(mcpTokens).where(eq(mcpTokens.id, id)).get();
  }

  findByUserId(userId: string, spaceId?: string): McpToken[] {
    const condition = spaceId
      ? and(eq(mcpTokens.userId, userId), eq(mcpTokens.spaceId, spaceId))
      : eq(mcpTokens.userId, userId);

    return this.db.select()
      .from(mcpTokens)
      .where(condition)
      .orderBy(desc(mcpTokens.createdAt))
      .all();
  }

  create(data: NewMcpToken): McpToken {
    this.db.insert(mcpTokens).values(data).run();
    return this.findById(data.id)!;
  }

  revoke(id: string, userId: string, revokedAt: string): boolean {
    const result = this.db.update(mcpTokens)
      .set({ revokedAt })
      .where(and(eq(mcpTokens.id, id), eq(mcpTokens.userId, userId)))
      .run();
    return result.changes > 0;
  }

  updateLastUsedAt(id: string, lastUsedAt: string): void {
    this.db.update(mcpTokens).set({ lastUsedAt }).where(eq(mcpTokens.id, id)).run();
  }
}
