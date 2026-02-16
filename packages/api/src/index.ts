import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ensureInitialized, getDb, runMigrations } from '@planner/core';
import { createApiContainer, type ApiContainer } from './container.js';
import { errorHandler } from './middleware/error.middleware.js';
import { createAuthMiddleware } from './middleware/auth.middleware.js';
import { createAreasRoutes } from './routes/areas.routes.js';
import { createGoalsRoutes } from './routes/goals.routes.js';
import { createTasksRoutes } from './routes/tasks.routes.js';
import { createHabitsRoutes } from './routes/habits.routes.js';
import { createStatusRoutes } from './routes/status.routes.js';
import { createChatRoutes } from './routes/chat.routes.js';
import { createAuthRoutes } from './routes/auth.routes.js';

export function createApp(container?: ApiContainer) {
  if (!container) {
    const db = getDb();
    runMigrations(db);
    container = createApiContainer();
  }

  const app = new Hono();

  // Global middleware
  app.use('*', cors({ origin: '*', credentials: true }));
  app.onError(errorHandler);

  // Auth routes (no auth required)
  app.route('/api/auth', createAuthRoutes(container));

  // Auth middleware for all other API routes
  if (process.env.PLANNER_GITHUB_CLIENT_ID) {
    const authMiddleware = createAuthMiddleware(container);
    app.use('/api/*', async (c, next) => {
      if (c.req.path.startsWith('/api/auth')) return next();
      return authMiddleware(c, next);
    });
  }

  // API routes
  app.route('/api/areas', createAreasRoutes(container));
  app.route('/api/goals', createGoalsRoutes(container));
  app.route('/api/tasks', createTasksRoutes(container));
  app.route('/api/habits', createHabitsRoutes(container));
  app.route('/api/status', createStatusRoutes(container));
  app.route('/api/chat', createChatRoutes(container));

  return { app, container };
}

export { createApiContainer, type ApiContainer } from './container.js';
export { createAreasRoutes } from './routes/areas.routes.js';
export { createGoalsRoutes } from './routes/goals.routes.js';
export { createTasksRoutes } from './routes/tasks.routes.js';
export { createHabitsRoutes } from './routes/habits.routes.js';
export { createStatusRoutes } from './routes/status.routes.js';
export { createChatRoutes } from './routes/chat.routes.js';
export { createAuthRoutes } from './routes/auth.routes.js';
