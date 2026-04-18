import { eq } from 'drizzle-orm';
import { userTrials, type UserTrial, type NewUserTrial } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class UserTrialRepository {
  constructor(private db: DB) {}

  findByUserId(userId: string): UserTrial | undefined {
    return this.db.select().from(userTrials).where(eq(userTrials.userId, userId)).get();
  }

  findByStripeCustomerId(stripeCustomerId: string): UserTrial | undefined {
    return this.db.select().from(userTrials).where(eq(userTrials.stripeCustomerId, stripeCustomerId)).get();
  }

  create(data: NewUserTrial): UserTrial {
    this.db.insert(userTrials).values(data).run();
    return this.findByUserId(data.userId)!;
  }

  update(userId: string, data: Partial<Omit<NewUserTrial, 'userId' | 'createdAt'>>): UserTrial | undefined {
    this.db.update(userTrials).set(data).where(eq(userTrials.userId, userId)).run();
    return this.findByUserId(userId);
  }
}
