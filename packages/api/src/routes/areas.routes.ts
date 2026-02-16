import { Hono } from 'hono';
import type { ApiContainer } from '../container.js';

export function createAreasRoutes(container: ApiContainer): Hono {
  const app = new Hono();
  const { areaService } = container;

  app.get('/', (c) => {
    const areas = areaService.list();
    return c.json(areas);
  });

  app.get('/:id', (c) => {
    const detail = areaService.show(c.req.param('id'));
    return c.json(detail);
  });

  app.post('/', async (c) => {
    const body = await c.req.json<{ name: string; description?: string }>();
    const area = areaService.add(body.name, body.description);
    return c.json(area, 201);
  });

  app.patch('/:id', async (c) => {
    const body = await c.req.json<{ name?: string; description?: string }>();
    const area = areaService.edit(c.req.param('id'), body);
    return c.json(area);
  });

  app.delete('/:id', (c) => {
    areaService.remove(c.req.param('id'));
    return c.json({ ok: true });
  });

  return app;
}
