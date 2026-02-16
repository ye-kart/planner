import type { Context } from 'hono';
import { NotFoundError, ValidationError, NotInitializedError, ChatError } from '@planner/core';

export function errorHandler(err: Error, c: Context): Response {
  if (err instanceof NotFoundError) {
    return c.json({ error: err.message }, 404);
  }
  if (err instanceof ValidationError) {
    return c.json({ error: err.message }, 400);
  }
  if (err instanceof NotInitializedError) {
    return c.json({ error: err.message }, 503);
  }
  if (err instanceof ChatError) {
    return c.json({ error: err.message }, 502);
  }
  console.error('Unhandled error:', err);
  return c.json({ error: err.message || 'Internal server error' }, 500);
}
