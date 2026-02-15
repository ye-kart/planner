import { eq, asc, sql } from 'drizzle-orm';
import { messages, type Message, type NewMessage } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class MessageRepository {
  constructor(private db: DB) {}

  findByConversationId(conversationId: string): Message[] {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.position))
      .all();
  }

  getMaxPosition(conversationId: string): number {
    const result = this.db
      .select({ maxPos: sql<number>`MAX(${messages.position})` })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .get();
    return result?.maxPos ?? -1;
  }

  create(data: NewMessage): Message {
    this.db.insert(messages).values(data).run();
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.id, data.id!))
      .get()!;
  }

  deleteByConversationId(conversationId: string): boolean {
    const result = this.db
      .delete(messages)
      .where(eq(messages.conversationId, conversationId))
      .run();
    return result.changes > 0;
  }
}
