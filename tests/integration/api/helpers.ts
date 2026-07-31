import {
  createTestContainer,
  type DB,
  SessionRepository,
  PasswordCredentialRepository,
  EmailTokenRepository,
  SpaceRepository,
  SpaceService,
  AllowedUserRepository,
  UserTrialRepository,
  TrialService,
} from '@planner/core';
import { ChatService } from '@planner/ai';
import { createApp, type ApiContainer } from '@planner/api';
import { createTestDb, createTestSpace } from '../helpers/db';

export function createTestApiContainer(db: DB, spaceId: string): ApiContainer {
  const core = createTestContainer(db, spaceId);
  const sessionRepo = new SessionRepository(db);
  const passwordCredentialRepo = new PasswordCredentialRepository(db);
  const emailTokenRepo = new EmailTokenRepository(db);
  const allowedUserRepo = new AllowedUserRepository(db);
  const userTrialRepo = new UserTrialRepository(db);
  const trialService = new TrialService(userTrialRepo, allowedUserRepo);
  const spaceRepo = new SpaceRepository(db);
  const spaceService = new SpaceService(spaceRepo);

  const chatService = new ChatService(
    core.conversationRepo, core.messageRepo, core.configService,
    core.areaService, core.goalService, core.taskService, core.habitService, core.contextService,
  );

  return { ...core, chatService, sessionRepo, passwordCredentialRepo, emailTokenRepo, allowedUserRepo, userTrialRepo, trialService, spaceService };
}

export function createTestApp() {
  const db = createTestDb();
  const spaceId = createTestSpace(db);
  const container = createTestApiContainer(db, spaceId);
  const { app } = createApp({ container, db });
  return { app, container, db, spaceId };
}
