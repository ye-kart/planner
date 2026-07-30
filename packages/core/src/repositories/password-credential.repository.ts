import { eq } from 'drizzle-orm';
import { passwordCredentials, type PasswordCredential, type NewPasswordCredential } from '../db/schema.js';
import type { DB } from '../db/connection.js';

export class PasswordCredentialRepository {
  constructor(private db: DB) {}

  findByEmail(email: string): PasswordCredential | undefined {
    return this.db.select().from(passwordCredentials).where(eq(passwordCredentials.email, email)).get();
  }

  create(data: NewPasswordCredential): PasswordCredential {
    this.db.insert(passwordCredentials).values(data).run();
    return this.findByEmail(data.email)!;
  }

  markVerified(email: string, verifiedAt: string): void {
    this.db.update(passwordCredentials).set({ verifiedAt, updatedAt: verifiedAt }).where(eq(passwordCredentials.email, email)).run();
  }

  updatePassword(email: string, passwordHash: string, updatedAt: string): void {
    this.db.update(passwordCredentials).set({ passwordHash, updatedAt }).where(eq(passwordCredentials.email, email)).run();
  }
}
