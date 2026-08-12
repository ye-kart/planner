import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ensureInitialized, getDb, runMigrations, type DB } from '@planner/core';
import { createApiContainerForSpace, type ApiContainer } from './container.js';
import { errorHandler } from './middleware/error.middleware.js';
import { createAuthMiddleware } from './middleware/auth.middleware.js';
import { createSpaceMiddleware } from './middleware/space.middleware.js';
import { createAreasRoutes } from './routes/areas.routes.js';
import { createGoalsRoutes } from './routes/goals.routes.js';
import { createTasksRoutes } from './routes/tasks.routes.js';
import { createHabitsRoutes } from './routes/habits.routes.js';
import { createStatusRoutes } from './routes/status.routes.js';
import { createChatRoutes } from './routes/chat.routes.js';
import { createAuthRoutes } from './routes/auth.routes.js';
import { createSpacesRoutes } from './routes/spaces.routes.js';
import { createAdminRoutes } from './routes/admin.routes.js';
import { createMcpTokenRoutes } from './routes/mcp-tokens.routes.js';
import { createPlannerMcpApp } from './mcp/server.js';
import { getMcpConfig, type McpConfig } from './mcp/config.js';
import { getBillingConfig, type BillingConfig } from './config/billing.js';

interface CreateAppOptions {
  container?: ApiContainer;
  db?: DB;
  mcpConfig?: McpConfig;
  billingConfig?: BillingConfig;
}

export function createApp(options?: CreateAppOptions) {
  const db = options?.db ?? getDb();
  if (!options?.container) {
    runMigrations(db);
  }

  const app = new Hono();
  const mcpConfig = options?.mcpConfig ?? getMcpConfig();
  const billingConfig = options?.billingConfig ?? getBillingConfig();

  // Global middleware
  app.use('*', cors({ origin: '*', credentials: true }));
  app.onError(errorHandler);
  app.route('/mcp', createPlannerMcpApp(db, mcpConfig));

  // If a fixed container is provided (testing), use it directly
  if (options?.container) {
    return createAppWithFixedContainer(app, options.container, db, mcpConfig, billingConfig);
  }

  // --- Auth routes (no auth, no space scoping) ---
  // Auth needs a container for sessionRepo — create one with a dummy space for unscoped access
  const authContainer = createApiContainerForSpace(db, '__auth__');
  app.route('/api/auth', createAuthRoutes(authContainer, billingConfig));

  // Auth middleware for all other API routes
  if (process.env.PLANNER_GITHUB_CLIENT_ID || process.env.PLANNER_GOOGLE_CLIENT_ID || (process.env.PLANNER_RESEND_API_KEY && process.env.PLANNER_EMAIL_FROM)) {
    const authMiddleware = createAuthMiddleware(authContainer);
    app.use('/api/*', async (c, next) => {
      if (c.req.path.startsWith('/api/auth')) return next();
      return authMiddleware(c, next);
    });
  }

  // --- Space CRUD (unscoped) ---
  app.route('/api/spaces', createSpacesRoutes(db));

  // --- Admin routes (requires admin role) ---
  app.route('/api/admin', createAdminRoutes(authContainer));

  // --- User-managed MCP access grants ---
  app.route('/api/mcp', createMcpTokenRoutes(authContainer, mcpConfig));

  // --- Space-scoped routes ---
  const spaceMiddleware = createSpaceMiddleware(db);
  const getContainer = (c: { get: (key: string) => unknown }) => c.get('scopedContainer') as ApiContainer;

  const scoped = new Hono();
  scoped.use('*', spaceMiddleware);
  scoped.route('/areas', createAreasRoutes(getContainer));
  scoped.route('/goals', createGoalsRoutes(getContainer));
  scoped.route('/tasks', createTasksRoutes(getContainer));
  scoped.route('/habits', createHabitsRoutes(getContainer));
  scoped.route('/status', createStatusRoutes(getContainer));
  scoped.route('/chat', createChatRoutes(getContainer, billingConfig));

  app.route('/api/spaces/:spaceId', scoped);

  return { app, db };
}

// For testing: fixed container, flat routes (no space middleware)
function createAppWithFixedContainer(
  app: Hono,
  container: ApiContainer,
  db: DB,
  mcpConfig: McpConfig,
  billingConfig: BillingConfig,
) {
  const getContainer = () => container;

  app.route('/api/auth', createAuthRoutes(container, billingConfig));
  app.route('/api/mcp', createMcpTokenRoutes(container, mcpConfig));
  app.route('/api/spaces', createSpacesRoutes(db));
  app.route('/api/spaces/:spaceId/areas', createAreasRoutes(getContainer));
  app.route('/api/spaces/:spaceId/goals', createGoalsRoutes(getContainer));
  app.route('/api/spaces/:spaceId/tasks', createTasksRoutes(getContainer));
  app.route('/api/spaces/:spaceId/habits', createHabitsRoutes(getContainer));
  app.route('/api/spaces/:spaceId/status', createStatusRoutes(getContainer));
  app.route('/api/spaces/:spaceId/chat', createChatRoutes(getContainer, billingConfig));

  return { app, container, db };
}

export { createApiContainer, createApiContainerForSpace, type ApiContainer } from './container.js';
export { createAreasRoutes } from './routes/areas.routes.js';
export { createGoalsRoutes } from './routes/goals.routes.js';
export { createTasksRoutes } from './routes/tasks.routes.js';
export { createHabitsRoutes } from './routes/habits.routes.js';
export { createStatusRoutes } from './routes/status.routes.js';
export { createChatRoutes } from './routes/chat.routes.js';
export { createAuthRoutes } from './routes/auth.routes.js';
export { createSpacesRoutes } from './routes/spaces.routes.js';
export { createMcpTokenRoutes } from './routes/mcp-tokens.routes.js';
export { createPlannerMcpApp } from './mcp/server.js';
export { getMcpConfig, type McpConfig } from './mcp/config.js';
export {
  getBillingConfig,
  createAnonymousAccessStatus,
  createBillingAccessStatus,
  createFreeAccessStatus,
  type AccessStatus,
  type AccessStatusState,
  type BillingConfig,
} from './config/billing.js';
