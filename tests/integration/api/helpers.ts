import {
  createTestContainer,
  type DB,
  SessionRepository,
  ConversationRepository,
  MessageRepository,
} from '@planner/core';
import { ChatService, type AiContainer } from '@planner/ai';
import { createApp, type ApiContainer } from '@planner/api';
import { createTestDb } from '../helpers/db';

export function createTestApiContainer(db: DB): ApiContainer {
  const core = createTestContainer(db);
  const conversationRepo = new ConversationRepository(db);
  const messageRepo = new MessageRepository(db);
  const sessionRepo = new SessionRepository(db);

  const chatService = new ChatService(
    conversationRepo, messageRepo, core.configService,
    core.areaService, core.goalService, core.taskService, core.habitService, core.contextService,
  );

  return { ...core, chatService, sessionRepo };
}

export function createTestApp() {
  const db = createTestDb();
  const container = createTestApiContainer(db);
  const { app } = createApp(container);
  return { app, container, db };
}
