import { getDb, type DB } from './db/connection.js';
import { AreaRepository } from './repositories/area.repository.js';
import { GoalRepository } from './repositories/goal.repository.js';
import { MilestoneRepository } from './repositories/milestone.repository.js';
import { TaskRepository } from './repositories/task.repository.js';
import { HabitRepository } from './repositories/habit.repository.js';
import { CompletionRepository } from './repositories/completion.repository.js';
import { InitService } from './services/init.service.js';
import { AreaService } from './services/area.service.js';
import { GoalService } from './services/goal.service.js';
import { TaskService } from './services/task.service.js';
import { HabitService } from './services/habit.service.js';
import { ContextService } from './services/context.service.js';
import { StatusService } from './services/status.service.js';

let _container: ReturnType<typeof createContainer> | null = null;

function createContainer(db: DB) {
  // Repositories
  const areaRepo = new AreaRepository(db);
  const goalRepo = new GoalRepository(db);
  const milestoneRepo = new MilestoneRepository(db);
  const taskRepo = new TaskRepository(db);
  const habitRepo = new HabitRepository(db);
  const completionRepo = new CompletionRepository(db);

  // Services
  const initService = new InitService(db);
  const areaService = new AreaService(areaRepo, goalRepo, taskRepo, habitRepo);
  const goalService = new GoalService(goalRepo, milestoneRepo, areaRepo, taskRepo, habitRepo);
  const taskService = new TaskService(taskRepo, areaRepo, goalRepo);
  const habitService = new HabitService(habitRepo, completionRepo, areaRepo, goalRepo);
  const contextService = new ContextService(areaRepo, goalRepo, milestoneRepo, taskRepo, habitRepo, completionRepo);
  const statusService = new StatusService(taskService, habitService);

  return {
    initService,
    areaService,
    goalService,
    taskService,
    habitService,
    contextService,
    statusService,
  };
}

export function getContainer() {
  if (!_container) {
    _container = createContainer(getDb());
  }
  return _container;
}

export function createTestContainer(db: DB) {
  return createContainer(db);
}
