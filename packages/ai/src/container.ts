import {
  getContainer,
  createCoreContainer,
  type CoreContainer,
  type DB,
} from '@planner/core';
import { ChatService } from './services/chat.service.js';

export interface AiContainer extends CoreContainer {
  chatService: ChatService;
}

export function createAiContainer(): AiContainer {
  const core = getContainer();

  const chatService = new ChatService(
    core.conversationRepo, core.messageRepo, core.configService,
    core.areaService, core.goalService, core.taskService, core.habitService, core.contextService,
  );

  return { ...core, chatService };
}

export function createAiContainerWith(db: DB, spaceId: string): AiContainer {
  const core = createCoreContainer(db, spaceId);

  const chatService = new ChatService(
    core.conversationRepo, core.messageRepo, core.configService,
    core.areaService, core.goalService, core.taskService, core.habitService, core.contextService,
  );

  return { ...core, chatService };
}
