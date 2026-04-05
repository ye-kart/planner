import { Hono } from 'hono';
import { SpaceRepository, SpaceService, type DB } from '@planner/core';

export function createSpacesRoutes(db: DB): Hono {
  const app = new Hono();
  const spaceRepo = new SpaceRepository(db);
  const spaceService = new SpaceService(spaceRepo);

  app.get('/', (c) => {
    const spaces = spaceService.list();
    return c.json(spaces);
  });

  app.get('/:id', (c) => {
    const space = spaceService.show(c.req.param('id'));
    return c.json(space);
  });

  app.post('/', async (c) => {
    const body = await c.req.json<{ name: string; description?: string; icon?: string }>();
    const space = spaceService.add(body.name, { description: body.description, icon: body.icon });
    return c.json(space, 201);
  });

  app.patch('/:id', async (c) => {
    const body = await c.req.json<{ name?: string; description?: string; icon?: string }>();
    const space = spaceService.edit(c.req.param('id'), body);
    return c.json(space);
  });

  app.delete('/:id', (c) => {
    spaceService.remove(c.req.param('id'));
    return c.json({ ok: true });
  });

  return app;
}
