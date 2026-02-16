import { Hono } from 'hono';
import type { ApiContainer } from '../container.js';

export function createTasksRoutes(container: ApiContainer): Hono {
  const app = new Hono();
  const { taskService } = container;

  app.get('/', (c) => {
    const status = c.req.query('status');
    const priority = c.req.query('priority');
    const areaId = c.req.query('areaId');
    const goalId = c.req.query('goalId');
    const tasks = taskService.list({ status, priority, areaId, goalId });
    return c.json(tasks);
  });

  app.get('/:id', (c) => {
    const task = taskService.show(c.req.param('id'));
    return c.json(task);
  });

  app.post('/', async (c) => {
    const body = await c.req.json<{
      title: string;
      areaId?: string;
      goalId?: string;
      priority?: string;
      dueDate?: string;
      description?: string;
    }>();
    const task = taskService.add(body.title, {
      areaId: body.areaId,
      goalId: body.goalId,
      priority: body.priority,
      dueDate: body.dueDate,
      description: body.description,
    });
    return c.json(task, 201);
  });

  app.patch('/:id', async (c) => {
    const body = await c.req.json<{
      title?: string;
      status?: string;
      priority?: string;
      dueDate?: string | null;
      areaId?: string | null;
      goalId?: string | null;
      description?: string | null;
    }>();
    const task = taskService.edit(c.req.param('id'), body);
    return c.json(task);
  });

  app.delete('/:id', (c) => {
    taskService.remove(c.req.param('id'));
    return c.json({ ok: true });
  });

  app.post('/:id/done', (c) => {
    const task = taskService.markDone(c.req.param('id'));
    return c.json(task);
  });

  app.post('/:id/start', (c) => {
    const task = taskService.start(c.req.param('id'));
    return c.json(task);
  });

  return app;
}
