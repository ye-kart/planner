import { eq, and } from 'drizzle-orm';
import { allowedUsers, type AllowedUser, type NewAllowedUser } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class AllowedUserRepository {
  constructor(private db: DB) {}

  findAll(): AllowedUser[] {
    return this.db.select().from(allowedUsers).all();
  }

  findById(id: string): AllowedUser | undefined {
    return this.db.select().from(allowedUsers).where(eq(allowedUsers.id, id)).get();
  }

  findByProviderAndUsername(provider: string, username: string): AllowedUser | undefined {
    return this.db.select().from(allowedUsers)
      .where(and(eq(allowedUsers.provider, provider as 'github' | 'google'), eq(allowedUsers.username, username)))
      .get();
  }

  isAllowed(provider: string, username: string): boolean {
    const count = this.findAll().length;
    if (count === 0) return true; // No allowlist = allow all
    return !!this.findByProviderAndUsername(provider, username);
  }

  isAdmin(provider: string, username: string): boolean {
    const user = this.findByProviderAndUsername(provider, username);
    return user?.isAdmin ?? false;
  }

  create(data: NewAllowedUser): AllowedUser {
    this.db.insert(allowedUsers).values(data).run();
    return this.findById(data.id)!;
  }

  delete(id: string): boolean {
    const result = this.db.delete(allowedUsers).where(eq(allowedUsers.id, id)).run();
    return result.changes > 0;
  }
}
