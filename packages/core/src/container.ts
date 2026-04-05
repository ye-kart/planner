import { sql } from 'drizzle-orm';
import { getDb, type DB } from './db/connection.js';
import { SpaceRepository } from './repositories/space.repository.js';
import { AreaRepository } from './repositories/area.repository.js';
import { GoalRepository } from './repositories/goal.repository.js';
import { MilestoneRepository } from './repositories/milestone.repository.js';
import { TaskRepository } from './repositories/task.repository.js';
import { HabitRepository } from './repositories/habit.repository.js';
import { CompletionRepository } from './repositories/completion.repository.js';
import { ConversationRepository } from './repositories/conversation.repository.js';
import { MessageRepository } from './repositories/message.repository.js';
import { SessionRepository } from './repositories/session.repository.js';
import { SpaceService } from './services/space.service.js';
import { InitService } from './services/init.service.js';
import { AreaService } from './services/area.service.js';
import { GoalService } from './services/goal.service.js';
import { TaskService } from './services/task.service.js';
import { HabitService } from './services/habit.service.js';
import { ContextService } from './services/context.service.js';
import { StatusService } from './services/status.service.js';
import { ConfigService } from './services/config.service.js';
import { ExportService } from './services/export.service.js';

export function createCoreContainer(db: DB, spaceId: string) {
  // Unscoped repositories
  const spaceRepo = new SpaceRepository(db);
  const milestoneRepo = new MilestoneRepository(db);
  const completionRepo = new CompletionRepository(db);
  const messageRepo = new MessageRepository(db);
  const sessionRepo = new SessionRepository(db);

  // Space-scoped repositories
  const areaRepo = new AreaRepository(db, spaceId);
  const goalRepo = new GoalRepository(db, spaceId);
  const taskRepo = new TaskRepository(db, spaceId);
  const habitRepo = new HabitRepository(db, spaceId);
  const conversationRepo = new ConversationRepository(db, spaceId);

  // Services
  const spaceService = new SpaceService(spaceRepo);
  const initService = new InitService(db);
  const areaService = new AreaService(areaRepo, goalRepo, taskRepo, habitRepo);
  const goalService = new GoalService(goalRepo, milestoneRepo, areaRepo, taskRepo, habitRepo);
  const taskService = new TaskService(taskRepo, areaRepo, goalRepo);
  const habitService = new HabitService(habitRepo, completionRepo, areaRepo, goalRepo);
  const contextService = new ContextService(areaRepo, goalRepo, milestoneRepo, taskRepo, habitRepo, completionRepo);
  const statusService = new StatusService(taskService, habitService);
  const configService = new ConfigService();
  const exportService = new ExportService(contextService);

  return {
    spaceService,
    initService,
    areaService,
    goalService,
    taskService,
    habitService,
    contextService,
    statusService,
    configService,
    exportService,
    // Exposed for consumer packages to extend
    conversationRepo,
    messageRepo,
    sessionRepo,
  };
}

export type CoreContainer = ReturnType<typeof createCoreContainer>;

let _container: CoreContainer | null = null;

export function getContainer(): CoreContainer {
  if (!_container) {
    const db = getDb();
    const configService = new ConfigService();
    const spaceId = resolveSpaceId(db, configService);
    _container = createCoreContainer(db, spaceId);
  }
  return _container;
}

export function createTestContainer(db: DB, spaceId: string): CoreContainer {
  return createCoreContainer(db, spaceId);
}

function resolveSpaceId(db: DB, configService: ConfigService): string {
  // 1. Check config file for a saved space
  const savedId = configService.getCurrentSpaceId();
  if (savedId) {
    const exists = db.all(sql`SELECT id FROM spaces WHERE id = ${savedId}`);
    if (exists.length > 0) return savedId;
  }

  // 2. Fall back to the first space by position
  const first = db.all(sql`SELECT id FROM spaces ORDER BY position ASC LIMIT 1`);
  if (first.length > 0) {
    return (first[0] as { id: string }).id;
  }

  // 3. No spaces yet (pre-init) — return a placeholder that will be replaced after init
  return '__uninitialized__';
}
