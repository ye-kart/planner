import { Hono } from 'hono';
import type { ApiContainer } from '../container.js';

export function createHabitsRoutes(container: ApiContainer): Hono {
  const app = new Hono();
  const { habitService } = container;

  app.get('/', (c) => {
    const areaId = c.req.query('areaId');
    const goalId = c.req.query('goalId');
    const habits = habitService.list({ areaId, goalId });
    return c.json(habits);
  });

  app.get('/today', (c) => {
    const habits = habitService.getHabitsDueToday();
    return c.json(habits);
  });

  app.get('/streaks', (c) => {
    const streaks = habitService.streaks();
    return c.json(streaks);
  });

  app.get('/:id', (c) => {
    const detail = habitService.show(c.req.param('id'));
    return c.json(detail);
  });

  app.post('/', async (c) => {
    const body = await c.req.json<{
      title: string;
      frequency?: string;
      days?: number[];
      areaId?: string;
      goalId?: string;
    }>();
    const habit = habitService.add(body.title, {
      frequency: body.frequency,
      days: body.days,
      areaId: body.areaId,
      goalId: body.goalId,
    });
    return c.json(habit, 201);
  });

  app.patch('/:id', async (c) => {
    const body = await c.req.json<{
      title?: string;
      frequency?: string;
      days?: number[];
      areaId?: string | null;
      goalId?: string | null;
    }>();
    const habit = habitService.edit(c.req.param('id'), body);
    return c.json(habit);
  });

  app.delete('/:id', (c) => {
    habitService.remove(c.req.param('id'));
    return c.json({ ok: true });
  });

  app.post('/:id/check', async (c) => {
    const body = await c.req.json<{ date?: string }>().catch(() => ({} as { date?: string }));
    const completion = habitService.check(c.req.param('id'), body.date);
    return c.json(completion);
  });

  app.post('/:id/uncheck', async (c) => {
    const body = await c.req.json<{ date?: string }>().catch(() => ({} as { date?: string }));
    habitService.uncheck(c.req.param('id'), body.date);
    return c.json({ ok: true });
  });

  app.post('/:id/archive', (c) => {
    const habit = habitService.archive(c.req.param('id'));
    return c.json(habit);
  });

  app.post('/:id/restore', (c) => {
    const habit = habitService.restore(c.req.param('id'));
    return c.json(habit);
  });

  return app;
}
