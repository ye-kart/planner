import type { Context, Next } from 'hono';
import { SpaceRepository, type DB } from '@planner/core';
import { createApiContainerForSpace } from '../container.js';

export function createSpaceMiddleware(db: DB) {
  const spaceRepo = new SpaceRepository(db);

  return async (c: Context, next: Next) => {
    const spaceId = c.req.param('spaceId');
    if (!spaceId) {
      return c.json({ error: 'Space ID required' }, 400);
    }

    const space = spaceRepo.findById(spaceId);
    if (!space) {
      return c.json({ error: 'Space not found' }, 404);
    }

    const container = createApiContainerForSpace(db, spaceId);
    c.set('scopedContainer', container);
    c.set('spaceId', spaceId);
    await next();
  };
}
