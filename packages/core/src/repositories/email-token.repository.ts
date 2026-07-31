import { and, eq, isNull } from 'drizzle-orm';
import { emailTokens, type EmailToken, type NewEmailToken } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class EmailTokenRepository {
  constructor(private db: DB) {}

  create(data: NewEmailToken): EmailToken {
    this.db.insert(emailTokens).values(data).run();
    return this.db.select().from(emailTokens).where(eq(emailTokens.id, data.id!)).get()!;
  }

  findUnused(tokenHash: string, purpose: 'verify_email' | 'reset_password'): EmailToken | undefined {
    return this.db.select().from(emailTokens)
      .where(and(eq(emailTokens.tokenHash, tokenHash), eq(emailTokens.purpose, purpose), isNull(emailTokens.usedAt))).get();
  }

  markUsed(id: string, usedAt: string): void {
    this.db.update(emailTokens).set({ usedAt }).where(eq(emailTokens.id, id)).run();
  }
}
