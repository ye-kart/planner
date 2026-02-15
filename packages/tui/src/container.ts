import {
  getContainer,
  type CoreContainer,
  ConversationRepository,
  MessageRepository,
  getDb,
} from '@planner/core';
import { ChatService } from './services/chat.service.js';

export interface TuiContainer extends CoreContainer {
  chatService: ChatService;
}

export function createTuiContainer(): TuiContainer {
  const core = getContainer();
  const db = getDb();
  const conversationRepo = new ConversationRepository(db);
  const messageRepo = new MessageRepository(db);

  const chatService = new ChatService(
    conversationRepo, messageRepo, core.configService,
    core.areaService, core.goalService, core.taskService, core.habitService, core.contextService,
  );

  return { ...core, chatService };
}
