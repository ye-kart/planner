import { Hono } from 'hono';
import type { ApiContainer } from '../container.js';

export function createGoalsRoutes(container: ApiContainer): Hono {
  const app = new Hono();
  const { goalService } = container;

  app.get('/', (c) => {
    const areaId = c.req.query('areaId');
    const status = c.req.query('status');
    const goals = goalService.list({ areaId, status });
    return c.json(goals);
  });

  app.get('/:id', (c) => {
    const detail = goalService.show(c.req.param('id'));
    return c.json(detail);
  });

  app.post('/', async (c) => {
    const body = await c.req.json<{
      title: string;
      areaId?: string;
      targetDate?: string;
      priority?: string;
      description?: string;
    }>();
    const goal = goalService.add(body.title, {
      areaId: body.areaId,
      targetDate: body.targetDate,
      priority: body.priority,
      description: body.description,
    });
    return c.json(goal, 201);
  });

  app.patch('/:id', async (c) => {
    const body = await c.req.json<{
      title?: string;
      areaId?: string | null;
      status?: string;
      priority?: string;
      targetDate?: string | null;
      description?: string | null;
    }>();
    const goal = goalService.edit(c.req.param('id'), body);
    return c.json(goal);
  });

  app.delete('/:id', (c) => {
    goalService.remove(c.req.param('id'));
    return c.json({ ok: true });
  });

  app.post('/:id/progress', async (c) => {
    const body = await c.req.json<{ progress: number }>();
    const goal = goalService.setProgress(c.req.param('id'), body.progress);
    return c.json(goal);
  });

  app.post('/:id/done', (c) => {
    const goal = goalService.markDone(c.req.param('id'));
    return c.json(goal);
  });

  app.post('/:id/archive', (c) => {
    const goal = goalService.archive(c.req.param('id'));
    return c.json(goal);
  });

  // Milestone sub-routes
  app.post('/:id/milestones', async (c) => {
    const body = await c.req.json<{ title: string }>();
    const milestone = goalService.addMilestone(c.req.param('id'), body.title);
    return c.json(milestone, 201);
  });

  app.post('/milestones/:msId/toggle', (c) => {
    const milestone = goalService.toggleMilestone(c.req.param('msId'));
    return c.json(milestone);
  });

  app.delete('/milestones/:msId', (c) => {
    goalService.removeMilestone(c.req.param('msId'));
    return c.json({ ok: true });
  });

  return app;
}
