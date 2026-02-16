import { eq, lt } from 'drizzle-orm';
import { sessions, type Session, type NewSession } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class SessionRepository {
  constructor(private db: DB) {}

  findById(id: string): Session | undefined {
    return this.db.select().from(sessions).where(eq(sessions.id, id)).get();
  }

  create(data: NewSession): Session {
    this.db.insert(sessions).values(data).run();
    return this.findById(data.id!)!;
  }

  delete(id: string): boolean {
    const result = this.db.delete(sessions).where(eq(sessions.id, id)).run();
    return result.changes > 0;
  }

  deleteExpired(now: string): number {
    const result = this.db.delete(sessions).where(lt(sessions.expiresAt, now)).run();
    return result.changes;
  }
}
