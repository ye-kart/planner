import { eq, and, desc } from 'drizzle-orm';
import { conversations, type Conversation, type NewConversation } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class ConversationRepository {
  constructor(private db: DB, private spaceId: string) {}

  findAll(): Conversation[] {
    return this.db.select().from(conversations)
      .where(eq(conversations.spaceId, this.spaceId))
      .orderBy(desc(conversations.updatedAt))
      .all();
  }

  findById(id: string): Conversation | undefined {
    return this.db.select().from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.spaceId, this.spaceId)))
      .get();
  }

  create(data: Omit<NewConversation, 'spaceId'>): Conversation {
    this.db.insert(conversations).values({ ...data, spaceId: this.spaceId }).run();
    return this.findById(data.id!)!;
  }

  update(id: string, data: Partial<Omit<NewConversation, 'id'>>): Conversation | undefined {
    this.db.update(conversations).set(data)
      .where(and(eq(conversations.id, id), eq(conversations.spaceId, this.spaceId)))
      .run();
    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.spaceId, this.spaceId)))
      .run();
    return result.changes > 0;
  }
}
