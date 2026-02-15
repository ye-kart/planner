// Errors
export { PlannerError, NotFoundError, ValidationError, NotInitializedError, ChatError, ConfigError } from './errors.js';

// Database
export { getDb, createMemoryDb, resetDb, type DB } from './db/connection.js';
export { runMigrations } from './db/migrate.js';
export { seedDefaultAreas } from './db/seed.js';
export type {
  Area, NewArea,
  Goal, NewGoal,
  Milestone, NewMilestone,
  Task, NewTask,
  Habit, NewHabit,
  Completion, NewCompletion,
  Conversation, NewConversation,
  Message, NewMessage,
} from './db/schema.js';

// Repositories
export { AreaRepository } from './repositories/area.repository.js';
export { GoalRepository } from './repositories/goal.repository.js';
export { MilestoneRepository } from './repositories/milestone.repository.js';
export { TaskRepository } from './repositories/task.repository.js';
export { HabitRepository } from './repositories/habit.repository.js';
export { CompletionRepository } from './repositories/completion.repository.js';
export { ConversationRepository } from './repositories/conversation.repository.js';
export { MessageRepository } from './repositories/message.repository.js';

// Services
export { AreaService, type AreaWithStats, type AreaDetail } from './services/area.service.js';
export { GoalService, type GoalDetail } from './services/goal.service.js';
export { TaskService, type TaskWithOverdue } from './services/task.service.js';
export { HabitService, type HabitDetail, type HabitStreakOverview } from './services/habit.service.js';
export { ContextService } from './services/context.service.js';
export { StatusService, type StatusData } from './services/status.service.js';
export { ConfigService, type ChatConfig } from './services/config.service.js';
export { ExportService } from './services/export.service.js';
export { InitService } from './services/init.service.js';
export { calculateStreaks, type StreakResult } from './services/streak.js';

// Container
export { getContainer, createCoreContainer, createTestContainer, type CoreContainer } from './container.js';

// Utilities
export { generateId } from './utils/id.js';
export { today, toISODate, parseDate, dayOfWeek, isoWeek, addDays, diffDays, formatDateHuman } from './utils/date.js';
export { formatOutput } from './utils/output.js';
export { ensureInitialized } from './utils/guard.js';
export { getPlannerDir, getDbPath } from './utils/paths.js';
