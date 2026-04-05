import { Hono } from 'hono';
import type { Context } from 'hono';
import type { ApiContainer } from '../container.js';

type ContainerGetter = (c: Context) => ApiContainer;

export function createAreasRoutes(getContainer: ContainerGetter): Hono {
  const app = new Hono();

  app.get('/', (c) => {
    const { areaService } = getContainer(c);
    const areas = areaService.list();
    return c.json(areas);
  });

  app.get('/:id', (c) => {
    const { areaService } = getContainer(c);
    const detail = areaService.show(c.req.param('id'));
    return c.json(detail);
  });

  app.post('/', async (c) => {
    const { areaService } = getContainer(c);
    const body = await c.req.json<{ name: string; description?: string }>();
    const area = areaService.add(body.name, body.description);
    return c.json(area, 201);
  });

  app.patch('/:id', async (c) => {
    const { areaService } = getContainer(c);
    const body = await c.req.json<{ name?: string; description?: string }>();
    const area = areaService.edit(c.req.param('id'), body);
    return c.json(area);
  });

  app.delete('/:id', (c) => {
    const { areaService } = getContainer(c);
    areaService.remove(c.req.param('id'));
    return c.json({ ok: true });
  });

  return app;
}
