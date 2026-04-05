import { createAiContainer, createAiContainerWith, type AiContainer } from '@planner/ai';
import { SessionRepository, AllowedUserRepository, SpaceRepository, SpaceService, type DB } from '@planner/core';

export interface ApiContainer extends AiContainer {
  sessionRepo: SessionRepository;
  allowedUserRepo: AllowedUserRepository;
  spaceService: SpaceService;
}

export function createApiContainer(): ApiContainer {
  const ai = createAiContainer();
  return { ...ai } as ApiContainer;
}

export function createApiContainerForSpace(db: DB, spaceId: string): ApiContainer {
  const ai = createAiContainerWith(db, spaceId);
  const sessionRepo = new SessionRepository(db);
  const allowedUserRepo = new AllowedUserRepository(db);
  const spaceRepo = new SpaceRepository(db);
  const spaceService = new SpaceService(spaceRepo);

  return { ...ai, sessionRepo, allowedUserRepo, spaceService };
}
