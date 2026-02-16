import { Hono } from 'hono';
import type { ApiContainer } from '../container.js';

export function createStatusRoutes(container: ApiContainer): Hono {
  const app = new Hono();
  const { statusService } = container;

  app.get('/', (c) => {
    const status = statusService.getStatus();
    return c.json(status);
  });

  return app;
}
