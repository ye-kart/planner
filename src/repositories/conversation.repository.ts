import { eq, desc } from 'drizzle-orm';
import { conversations, type Conversation, type NewConversation } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class ConversationRepository {
  constructor(private db: DB) {}

  findAll(): Conversation[] {
    return this.db.select().from(conversations).orderBy(desc(conversations.updatedAt)).all();
  }

  findById(id: string): Conversation | undefined {
    return this.db.select().from(conversations).where(eq(conversations.id, id)).get();
  }

  create(data: NewConversation): Conversation {
    this.db.insert(conversations).values(data).run();
    return this.findById(data.id!)!;
  }

  update(id: string, data: Partial<Omit<NewConversation, 'id'>>): Conversation | undefined {
    this.db.update(conversations).set(data).where(eq(conversations.id, id)).run();
    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.delete(conversations).where(eq(conversations.id, id)).run();
    return result.changes > 0;
  }
}
