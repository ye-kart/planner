import { createAiContainer, type AiContainer } from '@planner/ai';
import { SessionRepository, getDb } from '@planner/core';

export interface ApiContainer extends AiContainer {
  sessionRepo: SessionRepository;
}

export function createApiContainer(): ApiContainer {
  const ai = createAiContainer();
  const db = getDb();
  const sessionRepo = new SessionRepository(db);

  return { ...ai, sessionRepo };
}
