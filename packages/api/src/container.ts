import { createAiContainer, createAiContainerWith, type AiContainer } from '@planner/ai';
import {
  SessionRepository,
  AllowedUserRepository,
  SpaceRepository,
  SpaceService,
  UserTrialRepository,
  TrialService,
  type DB,
} from '@planner/core';
import { BillingService, readBillingConfig } from './services/billing.service.js';

export interface ApiContainer extends AiContainer {
  sessionRepo: SessionRepository;
  allowedUserRepo: AllowedUserRepository;
  userTrialRepo: UserTrialRepository;
  trialService: TrialService;
  spaceService: SpaceService;
  billingService: BillingService | null;
}

export function createApiContainer(): ApiContainer {
  const ai = createAiContainer();
  return { ...ai } as ApiContainer;
}

export function createApiContainerForSpace(db: DB, spaceId: string): ApiContainer {
  const ai = createAiContainerWith(db, spaceId);
  const sessionRepo = new SessionRepository(db);
  const allowedUserRepo = new AllowedUserRepository(db);
  const userTrialRepo = new UserTrialRepository(db);
  const trialService = new TrialService(userTrialRepo, allowedUserRepo);
  const spaceRepo = new SpaceRepository(db);
  const spaceService = new SpaceService(spaceRepo);

  const billingConfig = readBillingConfig();
  const billingService = billingConfig
    ? new BillingService(userTrialRepo, billingConfig)
    : null;

  return {
    ...ai,
    sessionRepo,
    allowedUserRepo,
    userTrialRepo,
    trialService,
    spaceService,
    billingService,
  };
}
