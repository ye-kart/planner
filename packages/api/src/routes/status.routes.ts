import { Hono } from 'hono';
import type { Context } from 'hono';
import type { ApiContainer } from '../container.js';

type ContainerGetter = (c: Context) => ApiContainer;

export function createStatusRoutes(getContainer: ContainerGetter): Hono {
  const app = new Hono();

  app.get('/', (c) => {
    const { statusService } = getContainer(c);
    const status = statusService.getStatus();
    return c.json(status);
  });

  return app;
}
